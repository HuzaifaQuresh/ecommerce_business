
-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Trigger: on signup create profile + assign role (first user = admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Products
CREATE TYPE public.availability_status AS ENUM ('in_stock', 'on_demand', 'coming_soon', 'obsolete');

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL,
  price_pkr NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  image_url TEXT,
  manufacturer TEXT,
  color TEXT,
  availability availability_status NOT NULL DEFAULT 'in_stock',
  discount_pct INT NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  rating NUMERIC(2,1) DEFAULT 4.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone views products" ON public.products FOR SELECT USING (true);
CREATE POLICY "admins insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update products" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete products" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_title_trgm ON public.products USING gin(to_tsvector('english', title || ' ' || coalesce(description, '')));

-- Orders
CREATE TYPE public.order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  total_pkr NUMERIC(12,2) NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "anyone can place order" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "admins update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  price_pkr NUMERIC(12,2) NOT NULL,
  quantity INT NOT NULL
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own order items" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "anyone insert order items" ON public.order_items FOR INSERT WITH CHECK (true);

-- Settings
CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone views settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "admins manage settings" ON public.site_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.site_settings (key, value) VALUES
  ('site_name', '"NexusIoT"'),
  ('contact_email', '"sales@nexusiot.pk"'),
  ('contact_phone', '"+92 300 1234567"'),
  ('currency', '"PKR"'),
  ('tagline', '"Pakistan''s Premier IoT & Smart Home Solutions Platform"');

-- Seed products
INSERT INTO public.products (title, slug, description, category, price_pkr, stock, image_url, manufacturer, color, availability, discount_pct, tags, rating) VALUES
('Tuya Smart Wi-Fi Dome Camera 4MP', 'tuya-wifi-dome-4mp', 'Indoor 360° dome camera with night vision, motion detection, and cloud storage.', 'Smart Home', 8500, 42, 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600', 'Tuya', 'White', 'in_stock', 15, ARRAY['camera','wifi','tuya'], 4.6),
('Hikvision Bullet IP Camera 5MP', 'hikvision-bullet-5mp', 'Outdoor weatherproof bullet camera with 30m IR night vision.', 'Smart Home', 14500, 28, 'https://images.unsplash.com/photo-1610047458734-3c4bb09f9eb3?w=600', 'Hikvision', 'Gray', 'in_stock', 10, ARRAY['camera','bullet','outdoor'], 4.7),
('PTZ Auto-Tracking Camera 8MP', 'ptz-auto-track-8mp', 'Pan-tilt-zoom camera with AI human tracking and 25x optical zoom.', 'Smart Home', 89000, 6, 'https://images.unsplash.com/photo-1551808525-51a94da548ce?w=600', 'Dahua', 'Black', 'in_stock', 5, ARRAY['camera','ptz','ai'], 4.8),
('Raspberry Pi 5 - 8GB', 'raspberry-pi-5-8gb', 'Latest Pi 5 with quad-core ARM Cortex-A76, 8GB RAM.', 'Development Boards', 32000, 18, 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600', 'Raspberry Pi', 'Green', 'in_stock', 0, ARRAY['sbc','linux','dev'], 4.9),
('ESP32-WROOM-32 DevKit', 'esp32-wroom-devkit', 'Dual-core MCU with Wi-Fi + BLE for IoT prototyping.', 'Development Boards', 1450, 250, 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=600', 'Espressif', 'Black', 'in_stock', 20, ARRAY['esp32','wifi','ble'], 4.8),
('Arduino UNO R4 WiFi', 'arduino-uno-r4-wifi', 'Renesas RA4M1 + ESP32-S3, USB-C, on-board LED matrix.', 'Development Boards', 9800, 35, 'https://images.unsplash.com/photo-1553406830-ef2513450d76?w=600', 'Arduino', 'Blue', 'in_stock', 0, ARRAY['arduino','wifi'], 4.7),
('Tuya Zigbee Motion Sensor PIR', 'tuya-zigbee-pir', 'Battery PIR motion sensor with Zigbee 3.0 mesh.', 'Tuya Sensors', 1850, 180, 'https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=600', 'Tuya', 'White', 'in_stock', 25, ARRAY['sensor','zigbee','pir'], 4.5),
('Tuya Wi-Fi Door/Window Sensor', 'tuya-wifi-door-sensor', 'Magnetic contact sensor with instant push alerts.', 'Tuya Sensors', 1200, 220, 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600', 'Tuya', 'White', 'in_stock', 10, ARRAY['sensor','door','wifi'], 4.4),
('Tuya Smoke Detector Wi-Fi', 'tuya-smoke-wifi', 'Photoelectric smoke alarm with 85dB siren and app alerts.', 'Tuya Sensors', 3400, 90, 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600', 'Tuya', 'White', 'in_stock', 15, ARRAY['sensor','smoke','safety'], 4.6),
('Tuya Temp/Humidity Sensor Zigbee', 'tuya-temp-humidity', 'High-precision SHT30 sensor with LCD display.', 'Tuya Sensors', 2100, 140, 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=600', 'Tuya', 'White', 'in_stock', 0, ARRAY['sensor','temp','zigbee'], 4.7),
('Tuya Water Leak Detector', 'tuya-water-leak', 'Floor-placed water leak alarm, 2-year battery life.', 'Tuya Sensors', 2650, 75, 'https://images.unsplash.com/photo-1585675100618-7c4a93bf41a1?w=600', 'Tuya', 'White', 'in_stock', 5, ARRAY['sensor','water','safety'], 4.5),
('Tuya Gas Leak Sensor (LPG)', 'tuya-gas-lpg', 'LPG/natural gas detection with auto-cutoff relay output.', 'Tuya Sensors', 4800, 0, 'https://images.unsplash.com/photo-1585675100618-7c4a93bf41a1?w=600', 'Tuya', 'White', 'on_demand', 0, ARRAY['sensor','gas','safety'], 4.6),
('Tuya Zigbee Gateway Hub Pro', 'tuya-zigbee-gateway-pro', 'Multi-protocol hub: Zigbee 3.0 + Wi-Fi + Bluetooth. Up to 128 devices.', 'Gateways', 7900, 32, 'https://images.unsplash.com/photo-1551808525-51a94da548ce?w=600', 'Tuya', 'Black', 'in_stock', 12, ARRAY['gateway','zigbee','hub'], 4.7),
('LoRaWAN Industrial Gateway 8-channel', 'lorawan-gateway-8ch', 'Outdoor IP67 LoRaWAN gateway, 15km range.', 'Gateways', 145000, 4, 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600', 'RAK Wireless', 'Gray', 'in_stock', 0, ARRAY['gateway','lora','industrial'], 4.9),
('Tuya Smart RGB+CCT LED Bulb 9W', 'tuya-rgb-cct-bulb', '16M colors, voice control via Alexa/Google.', 'Smart Home', 1650, 320, 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600', 'Tuya', 'Multi', 'in_stock', 30, ARRAY['lighting','rgb','bulb'], 4.6),
('Smart Wi-Fi Switch 4-Gang (Glass Panel)', 'wifi-switch-4gang', 'Touch glass wall switch, neutral required.', 'Smart Home', 5400, 60, 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=600', 'Tuya', 'Black', 'in_stock', 10, ARRAY['switch','wifi'], 4.5),
('Industrial PLC - Siemens S7-1200', 'siemens-s7-1200', '14 DI / 10 DO compact PLC for industrial automation.', 'Industrial Automation', 145000, 5, 'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=600', 'Siemens', 'Gray', 'in_stock', 0, ARRAY['plc','industrial'], 4.9),
('SCADA HMI 7" Touch Panel', 'scada-hmi-7in', '7-inch resistive touch HMI, RS485 + Ethernet.', 'Industrial Automation', 68000, 8, 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600', 'Weintek', 'Black', 'in_stock', 0, ARRAY['hmi','scada'], 4.7),
('Modular Power Supply 12V 10A', 'psu-12v-10a', 'Industrial-grade DIN-rail PSU, 92% efficiency.', 'Power Modules', 6800, 45, 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600', 'MeanWell', 'Silver', 'in_stock', 8, ARRAY['power','psu'], 4.6),
('Buck Converter Module XL4015 5A', 'buck-xl4015-5a', 'Adjustable 4-38V to 1.25-36V step-down with display.', 'Power Modules', 850, 500, 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=600', 'Generic', 'Green', 'in_stock', 20, ARRAY['power','buck'], 4.4),
('TurtleBot 4 Lite ROS2 Robot', 'turtlebot-4-lite', 'Autonomous mobile robot for ROS2 development.', 'Robotics', 425000, 2, 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=600', 'Clearpath', 'Black', 'in_stock', 0, ARRAY['robot','ros2'], 5.0),
('6-DOF Robotic Arm Kit', 'robot-arm-6dof', 'Aluminum frame robot arm with MG996R servos.', 'Robotics', 28500, 12, 'https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=600', 'Generic', 'Black', 'in_stock', 15, ARRAY['robot','arm'], 4.5),
('Relay Module 8-Channel Optocoupler', 'relay-8ch-opto', '8-channel 10A relay board with optocoupler isolation.', 'Components', 1450, 280, 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=600', 'Generic', 'Blue', 'in_stock', 0, ARRAY['relay','module'], 4.5),
('Quantum AI Edge Inference Module', 'quantum-ai-edge', 'Next-gen edge AI accelerator. Pre-order now.', 'Components', 1430000, 0, 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600', 'NexusIoT', 'Black', 'coming_soon', 0, ARRAY['ai','edge','premium'], 5.0);
