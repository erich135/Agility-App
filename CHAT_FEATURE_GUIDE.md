# Chat Feature Setup Guide

## Overview
The chat widget has been added to your application! It appears as a floating button in the bottom-right corner when users are logged in.

## Features
- **Floating Widget**: Click the chat icon in bottom-right to open
- **User Selection**: Choose any user from your organization to chat with
- **Real-time Messaging**: Send and receive messages instantly
- **Read Status**: Messages are automatically marked as read when viewed
- **Unread Counter**: Badge shows number of unread messages
- **Minimize**: Minimize the chat while keeping it open

## Database Setup Required

You need to run the SQL script to create the `messages` table in your Supabase database:

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project: `nhzpfukswjgbchfczhsw`
3. Go to SQL Editor
4. Run the script from: `database/messages_schema.sql`

Or copy this SQL:

```sql
-- Create messages table for chat functionality
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id, created_at);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update their received messages" ON messages;

-- Create RLS policies
CREATE POLICY "Users can view their own messages" ON messages
    FOR SELECT
    USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id
    );

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages" ON messages
    FOR UPDATE
    USING (auth.uid() = receiver_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_updated_at ON messages;
CREATE TRIGGER messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_messages_updated_at();

-- Grant permissions
GRANT ALL ON messages TO authenticated;
GRANT ALL ON messages TO service_role;
```

## How to Use

1. **Login** to your application
2. **Look** for the blue chat button in the bottom-right corner
3. **Click** the button to open the chat widget
4. **Select** a user you want to chat with
5. **Type** your message and press Enter or click Send
6. **View** chat history and send messages in real-time

## Features Included

- ✅ Floating chat widget (bottom-right)
- ✅ User selection dropdown
- ✅ Message history with timestamps
- ✅ Send messages with Enter key or button
- ✅ Real-time message updates via Supabase subscriptions
- ✅ Unread message counter
- ✅ Minimize/maximize functionality
- ✅ Back button to select different users
- ✅ Auto-scroll to latest messages
- ✅ Read status tracking

## Technical Details

**Files Added:**
- `src/components/ChatWidget.jsx` - Main chat component
- `database/messages_schema.sql` - Database schema

**Files Modified:**
- `src/App.jsx` - Integrated ChatWidget (shows only when logged in)

**Database Schema:**
- Table: `messages`
- Columns: id, sender_id, receiver_id, message, is_read, created_at, updated_at
- Indexes on sender_id, receiver_id, created_at for performance
- RLS policies for secure access
