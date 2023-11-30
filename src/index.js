
// require('dotenv').config({path:'./env'});
import dotenv from 'dotenv';
import connectDB from "./db/index.js";

dotenv.config({
    path:'./.env'
})

connectDB();

// import express from 'express';
// const  app = express();
// (async () =>{
//     try {
//         mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//     }catch(error){
//         console.log('Error', error)
//     }
// })