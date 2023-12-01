import { asyncHanlder } from "../utils/asynHanlder.js";

const registerUser = asyncHanlder( async (req,res) =>{
    res.status(200).json({
        message:"OK"
    })
})

export {registerUser };