# Supabase Email Templates for Migonest

This file contains branded email templates for your Supabase project with **inlined styles** for better compatibility.

### How to use:
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **Authentication > Email Templates**.
3. Copy the **Subject** and **HTML Content** for each template listed below.

---

## 1. Confirm your signup
**Subject:** Confirm your Migonest Account

```html
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #02569B; margin-bottom: 5px;">Migonest</h1>
    <p style="color: #666; font-size: 14px; margin-top: 0;">Study Abroad Made Simple</p>
  </div>
  
  <h2>Confirm your signup</h2>
  <p>Thank you for joining Migonest! Please follow the link below to verify your email address and activate your account:</p>
  <p>
    <a href="{{ .ConfirmationURL }}" style="background-color: #02569B; border: none; color: #ffffff !important; padding: 12px 24px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer; border-radius: 8px; font-weight: bold; -webkit-text-fill-color: #ffffff;">Confirm Email</a>
  </p>
  
  <p style="margin-top: 40px; font-size: 12px; color: #999;">
    If you didn't create an account, you can safely ignore this email.
  </p>
  <p style="margin-top: 20px; font-size: 11px; color: #bbb; border-top: 1px solid #eee; padding-top: 10px;">
    Migonest is a product of MigSky LLC. Authentication is managed by Supabase.
  </p>
</body>
</html>
```

---

## 2. Reset Password
**Subject:** Reset your Migonest Password

```html
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #02569B; margin-bottom: 5px;">Migonest</h1>
    <p style="color: #666; font-size: 14px; margin-top: 0;">Study Abroad Made Simple</p>
  </div>
  
  <h2>Reset Password</h2>
  <p>We received a request to reset your Migonest password. Follow the link below to choose a new one:</p>
  <p>
    <a href="{{ .ConfirmationURL }}" style="background-color: #02569B; border: none; color: #ffffff !important; padding: 12px 24px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer; border-radius: 8px; font-weight: bold; -webkit-text-fill-color: #ffffff;">Reset Password</a>
  </p>
  
  <p style="margin-top: 40px; font-size: 12px; color: #999;">
    If you didn't request a password reset, you can safely ignore this email. This link will expire shortly.
  </p>
  <p style="margin-top: 20px; font-size: 11px; color: #bbb; border-top: 1px solid #eee; padding-top: 10px;">
    Migonest is a product of MigSky LLC. Authentication is managed by Supabase.
  </p>
</body>
</html>
```

---

## 3. Magic Link
**Subject:** Log in to Migonest

```html
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #02569B; margin-bottom: 5px;">Migonest</h1>
    <p style="color: #666; font-size: 14px; margin-top: 0;">Study Abroad Made Simple</p>
  </div>
  
  <h2>Magic Link Login</h2>
  <p>Click the button below to log in to your Migonest account instantly:</p>
  <p>
    <a href="{{ .ConfirmationURL }}" style="background-color: #02569B; border: none; color: #ffffff !important; padding: 12px 24px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer; border-radius: 8px; font-weight: bold; -webkit-text-fill-color: #ffffff;">Log In to Migonest</a>
  </p>
  
  <p style="margin-top: 40px; font-size: 12px; color: #999;">
    If you didn't request this login link, you can safely ignore this email.
  </p>
  <p style="margin-top: 20px; font-size: 11px; color: #bbb; border-top: 1px solid #eee; padding-top: 10px;">
    Migonest is a product of MigSky LLC. Authentication is managed by Supabase.
  </p>
</body>
</html>
```

---

## 4. Change Email Address
**Subject:** Confirm your new email address

```html
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #02569B; margin-bottom: 5px;">Migonest</h1>
    <p style="color: #666; font-size: 14px; margin-top: 0;">Study Abroad Made Simple</p>
  </div>
  
  <h2>Confirm New Email</h2>
  <p>Please follow this link to confirm the change of your email address:</p>
  <p>
    <a href="{{ .ConfirmationURL }}" style="background-color: #02569B; border: none; color: #ffffff !important; padding: 12px 24px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer; border-radius: 8px; font-weight: bold; -webkit-text-fill-color: #ffffff;">Confirm Change</a>
  </p>
  
  <p style="margin-top: 40px; font-size: 12px; color: #999;">
    If you didn't request this change, please contact support immediately.
  </p>
  <p style="margin-top: 20px; font-size: 11px; color: #bbb; border-top: 1px solid #eee; padding-top: 10px;">
    Migonest is a product of MigSky LLC. Authentication is managed by Supabase.
  </p>
</body>
</html>
```
