-- Enable Row Level Security on the public_keys table
ALTER TABLE public.public_keys ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read any public key
CREATE POLICY "Anyone can read public keys" 
ON public.public_keys 
FOR SELECT 
USING (true);

-- Policy to allow users to insert/update only their own public key
CREATE POLICY "Users can insert their own public key" 
ON public.public_keys 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own public key" 
ON public.public_keys 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_public_keys_user_id ON public.public_keys (user_id);
