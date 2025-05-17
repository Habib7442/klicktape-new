-- Create the user_public_keys table for E2E encryption
CREATE TABLE IF NOT EXISTS public.user_public_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_id UNIQUE (user_id)
);

-- Add RLS policies
ALTER TABLE public.user_public_keys ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read any public key
CREATE POLICY "Anyone can read public keys" 
ON public.user_public_keys 
FOR SELECT 
USING (true);

-- Policy to allow users to insert/update only their own public key
CREATE POLICY "Users can insert their own public key" 
ON public.user_public_keys 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own public key" 
ON public.user_public_keys 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_public_keys_user_id ON public.user_public_keys (user_id);
