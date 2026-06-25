from PIL import Image, ImageOps
import os

def make_square_logo():
    logo_path = "/Users/mohammadwahedulhaque/Migonest-Prod/public/assets/Migonest-Primary-Logo.png"
    if not os.path.exists(logo_path):
        print(f"Error: {logo_path} not found.")
        return

    # Load landscape primary logo
    img = Image.open(logo_path)
    print(f"Original Logo Size: {img.size}")

    # We want a high-res square canvas (e.g. 1200x1200px)
    size = 1200
    # Create white canvas
    square_white = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    
    # Scale down the landscape logo to fit inside the square canvas with generous padding
    # Let's make the logo occupy 80% of the canvas width
    target_width = int(size * 0.8)
    aspect_ratio = img.height / img.width
    target_height = int(target_width * aspect_ratio)
    
    resized_img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
    
    # Calculate offset to center the logo
    offset_x = (size - target_width) // 2
    offset_y = (size - target_height) // 2
    
    # Paste centered
    square_white.paste(resized_img, (offset_x, offset_y), resized_img if resized_img.mode == 'RGBA' else None)
    
    # Save the output files
    output_path = "/Users/mohammadwahedulhaque/Migonest-Prod/public/assets/Migonest-Primary-Logo-Square.png"
    square_white.save(output_path, "PNG")
    print(f"Saved padded square sharing logo to: {output_path}")

    # Also make a transparent version just in case
    square_trans = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    square_trans.paste(resized_img, (offset_x, offset_y), resized_img if resized_img.mode == 'RGBA' else None)
    output_path_trans = "/Users/mohammadwahedulhaque/Migonest-Prod/public/assets/Migonest-Primary-Logo-Square-Trans.png"
    square_trans.save(output_path_trans, "PNG")
    print(f"Saved padded transparent square logo to: {output_path_trans}")

if __name__ == "__main__":
    make_square_logo()
