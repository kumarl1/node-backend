import { asyncHanlder } from "../utils/asynHanlder.js";
import { ApiError} from  "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinay} from "../utils/cloudinary.js";
import { ApiResponse} from "../utils/apiResponse.js";

const registerUser = asyncHanlder( async (req,res) =>{
    // GET the user details from FE
    //Validate
    //check  
    // s
   const { fullName, email,username,password} = res.body;
   console.log("email"+email);
   if([fullName,email,username,password].some( (field) => field?.trim() === "")){
     throw new ApiError(400, "All field are required")
   }
   const existedUser = User.findOne({
        $or:[ { username } ,{ email } ]
    });
    if(existedUser){
        throw new ApiError(409,"User with email or username already exist" );
    }
   const avatarLocalPath = req.files?.avatar[0]?.path;
   const coverImageLocalPath = req.files?.coverImage[0]?.path;
   if(!avatarLocalPath){
    throw new ApiError('400', "Avatar file is required");
   }

   const avatar = await uploadOnCloudinay(avatarLocalPath)
   const coverImage = await uploadOnCloudinay(coverImageLocalPath);
    if(!avatar) {
        throw new ApiError('400', "Avatar file is required");
    }
   const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        username:username.toLowerCase(),
        password
    });
    const createdUser = User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500, "Something went wronge while registering user")
    }
    return res.status(201).json( 
        new ApiResponse(200,createdUser, "User registered successfully" )
    )


})

export {registerUser };