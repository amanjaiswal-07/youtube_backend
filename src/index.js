// require('dotenv').config('./env')

import dotenv from "dotenv"
// import mongoose from "mongoose"
// import {DB_NAME} from "./constants.js"
//import express from "express"

dotenv.config({ 
    path: "./.env" 
}) // Load environment variables from .env file

// const app = express()

//approach 2 using import
import connectDB from "./db/db.js";
import { app } from "./app.js";
connectDB()//because this is asnc function, it returns a promise
.then(()=>{
    app.on("error", (err) => {
    console.error("Error connecting to MongoDB:", err);
    throw err;
    });
    app.listen(process.env.PORT || 5500, () => {
        console.log(`Server is running on port ${process.env.PORT || 5500}`);
    });
})
.catch((error)=>{
    console.error("Error connecting to MongoDB in start-up phase:", error);
    process.exit(1); // Exit the process with failure
})

// catch covers initialisation failures that happen inside the async IIFE.

// app.on("error") covers Express‑level failures that occur after start‑up, anywhere in the request/response lifecycle.

//approach 1: Using async/await
// ;(async()=>{
//     try{
//         await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
//         app.on("error", (err) => {
//             console.error("Error connecting to MongoDB:", err);
//             throw err;
//         });

//         app.listen(process.env.PORT,()=>{
//             console.log(`Server is running on port ${process.env.PORT}`)
//         } )
//     }
//     catch(err){
//         console.error("Error connecting to MongoDB:", err);
//         throw err;
//     }
// })()

