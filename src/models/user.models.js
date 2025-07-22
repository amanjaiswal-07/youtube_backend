import mongoose ,{ Schema } from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config({ 
    path: "./.env" 
})

const UserSchema = new Schema(
    {
        username:{
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true // Index for faster search in mongoDB
        },
        email:{
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        fullname:{
            type: String,
            required: true,
            trim: true,
            index: true // Index for faster search in mongoDB
        },

        avatar:{
            url:{
                type: String, // URL to the avatar image from cloudinary
                required: true,
            },
            public_id:{
                type: String,
                required: true,
            }
        },

        coverimage:{
            url:{
                type: String,
                },
            public_id:{
                type: String,
                }
        },
        
        watchHistory: {
            type: [
                {
                    type: Schema.Types.ObjectId,
                    ref: 'Video' // Reference to the Video model
                }
            ], // Array of video IDs
        },
        password:{
            type: String, //challenge
            required: [true, 'Password is required']
        },
        refreshToken:{
            type: String, // For storing the refresh token
        }
    },{timestamps: true} // Automatically manage createdAt and updatedAt fields
)

//why pre used here?
// Pre-save hook to hash the password before saving the user document
// pre is used to define middleware that runs before a document is saved
// in this case, it hashes the password if it has been modified

UserSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        // Hash the password before saving
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
})

UserSchema.methods.isPasswordMatch = async function(password) {
    // Compare the provided password with the hashed password
    return await bcrypt.compare(password, this.password);
}

//JWT is a bearer token that is used to authenticate users
// It is signed with a secret key and contains the user's information
UserSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            username: this.username,
            email: this.email,
            fullname: this.fullname,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

UserSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model('User',UserSchema)