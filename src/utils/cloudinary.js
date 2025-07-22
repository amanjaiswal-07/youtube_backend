import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

import dotenv from 'dotenv'
dotenv.config({
    path: "./.env" 
}) 
// (async function() {

//     // Configuration
//     cloudinary.config({ 
//         cloud_name: '', 
//         api_key: '', 
//         api_secret: '<your_api_secret>' // Click 'View API Keys' above to copy your API secret
//     });
    
//     // Upload an image
//      const uploadResult = await cloudinary.uploader
//        .upload(
//            'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg', {
//                public_id: 'shoes',
//            }
//        )
//        .catch((error) => {
//            console.log(error);
//        });
    
//     console.log(uploadResult);
    
//     // Optimize delivery by resizing and applying auto-format and auto-quality
//     const optimizeUrl = cloudinary.url('shoes', {
//         fetch_format: 'auto',
//         quality: 'auto'
//     });
    
//     console.log(optimizeUrl);
    
//     // Transform the image: auto-crop to square aspect_ratio
//     const autoCropUrl = cloudinary.url('shoes', {
//         crop: 'auto',
//         gravity: 'auto',
//         width: 500,
//         height: 500,
//     });
    
//     console.log(autoCropUrl);    
// })();

//here what we are doing is that we are uploading file from user using multer and keep it in on temporary on our server then using cloudinary we are taking file from our local server and uploading it to cloudinary and then deleting the file from our local server using fs.unlinkSync 
cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
});


const uploadOnCloudinary = async (localFilePath) => {
    try{
        if(!localFilePath) return null;
        //uploading file to cloudinary
        const result = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto', // Automatically detect the resource type (image, video, etc.)
        });
        // flie uploaded successfully, now delete the file from local server
        fs.unlinkSync(localFilePath); // Delete the file from local server
        // console.log('File uploaded to Cloudinary:', result.url);
        // console.log(result); //for debugging purposes
        return result; // Return the secure URL of the uploaded file
    }
    catch (error) {
        fs.unlinkSync(localFilePath); // Ensure the file is deleted even if upload fails
        console.log('Error uploading file to Cloudinary:', error);
        return null; // Return null in case of error
    }
};

const deleteFromCloudinary = async (publicId , resourceType = 'image')=>{
    try {
        const result = await cloudinary.uploader.destroy(publicId , {
            resource_type: resourceType
        })
        return result;
    } catch (error) {
        console.log(error ,' Cloudinary deletion failed')
        return null;
    }
};

export { uploadOnCloudinary, cloudinary , deleteFromCloudinary};
