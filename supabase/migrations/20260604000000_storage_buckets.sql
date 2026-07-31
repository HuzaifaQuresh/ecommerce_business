-- Create buckets for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT DO NOTHING;

-- Allow public read access to product images
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');

-- Allow authenticated users to insert product images
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');
