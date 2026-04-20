// Minimal test to see which imports fail on Vercel
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const results = {};
  
  try {
    const { ImapFlow } = await import('imapflow');
    results.imapflow = 'OK';
  } catch (e) {
    results.imapflow = `FAIL: ${e.message}`;
  }

  try {
    const { simpleParser } = await import('mailparser');
    results.mailparser = 'OK';
  } catch (e) {
    results.mailparser = `FAIL: ${e.message}`;
  }

  try {
    const nodemailer = await import('nodemailer');
    results.nodemailer = 'OK';
  } catch (e) {
    results.nodemailer = `FAIL: ${e.message}`;
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    results.supabase = 'OK';
  } catch (e) {
    results.supabase = `FAIL: ${e.message}`;
  }

  return res.status(200).json(results);
}
