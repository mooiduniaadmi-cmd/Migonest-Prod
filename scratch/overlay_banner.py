import os
import qrcode
from PIL import Image, ImageDraw, ImageFont

def generate_qr(data):
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=20,
        border=1,
    )
    qr.add_data(data)
    qr.make(fit=True)
    # Generate sharp pure black-on-white QR Code
    qr_img = qr.make_image(fill_color="black", back_color="white").convert('RGBA')
    # Resize to exact 520x520 for ultra high-definition billboard crispness (at 4096x4096 scale)
    qr_img = qr_img.resize((520, 520), Image.Resampling.LANCZOS)
    return qr_img

def draw_text_wrapped(draw, text, x_center, y_start, font, fill, max_width):
    words = text.split(' ')
    lines = []
    current_line = []
    for word in words:
        current_line.append(word)
        w = draw.textlength(' '.join(current_line), font=font)
        if w > max_width:
            current_line.pop()
            lines.append(' '.join(current_line))
            current_line = [word]
    if current_line:
        lines.append(' '.join(current_line))
        
    y = y_start
    for line in lines:
        w = draw.textlength(line, font=font)
        draw.text((x_center - w // 2, y), line, fill=fill, font=font)
        y += 100 # Billboard-scale perfect line height
    return y

def create_billboard_banner():
    banner_path = 'public/assets/migonest_seminar_banner.png'
    output_public_path = 'public/assets/migonest_seminar_banner.png'
    output_assets_path = 'assets/migonest_seminar_banner.png'
    logo_path = 'public/assets/Migonest-Primary-Logo.png'
    
    # 1. Open original student banner
    img_orig = Image.open(banner_path).convert('RGBA')
    img = img_orig
    width, height = img.size
    
    # Create single drawing layer directly on the image
    draw = ImageDraw.Draw(img)
    
    # 2. Draw a gorgeous white pill capsule for the Primary Logo at the top center
    pill_w = 1520
    pill_h = 384
    pill_x = (width - pill_w) // 2
    pill_y = 120
    
    draw.rounded_rectangle(
        [pill_x, pill_y, pill_x + pill_w, pill_y + pill_h],
        radius=192,
        fill=(255, 255, 255, 255), # Pure solid white to completely cover the old logo
        outline=(2, 86, 155, 255), # Migonest primary brand color border (#02569B)
        width=12
    )
    
    # Load and resize logo to HD (original is 620x144, scaling to 1200x278)
    logo_w = 1200
    logo_h = 278
    logo_img = Image.open(logo_path).convert('RGBA')
    logo_img = logo_img.resize((logo_w, logo_h), Image.Resampling.LANCZOS)
    
    logo_x = pill_x + (pill_w - logo_w) // 2
    logo_y = pill_y + (pill_h - logo_h) // 2
    img.paste(logo_img, (logo_x, logo_y), logo_img)
    
    # Convert to RGB to save (no alpha composite layer, everything drawn directly!)
    final_img = img.convert('RGB')
    
    os.makedirs(os.path.dirname(output_public_path), exist_ok=True)
    os.makedirs(os.path.dirname(output_assets_path), exist_ok=True)
    
    # Save with optimized PNG compression
    final_img.save(output_public_path, 'PNG', optimize=True)
    final_img.save(output_assets_path, 'PNG', optimize=True)
    
    print("Overlay billboard-scale banner completed: updated Migonest logo border color cleanly!")
 
if __name__ == '__main__':
    create_billboard_banner()
