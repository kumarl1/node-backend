import { asyncHanlder } from "../utils/asynHanlder.js";
import { ApiError} from  "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinay} from "../utils/cloudinary.js";
import { ApiResponse} from "../utils/apiResponse.js";

const generateAccessAndRefeshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.gererateAccessToken();
        const refreshToken = user.gererateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave:false});
         return {
            accessToken, refreshToken
         }
    }catch(error){
        throw new ApiError(500, "Something went wronge while generating refresh token")
    }
}
const registerUser = asyncHanlder( async (req,res) =>{

   const { fullName, email,username,password} = req.body;
   if([fullName,email,username,password].some( (field) => field?.trim() === "")){
     throw new ApiError(400, "All field are required")
   }

   const existedUser =  await User.findOne({
        $or:[ { username } ,{ email } ]
    });

    if(existedUser){
        throw new ApiError(409,"User with email or username already exist" );
    }
    

   const avatarLocalPath = req.files?.avatar[0]?.path;
   let coverImageLocalPath;

    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImagelength > 0){
        coverImageLocalPath =  eq.files.coverImage[0]?.path
    }
   if(!avatarLocalPath){
    throw new ApiError('400', "Avatar file is required");
   }

   const avatar = await uploadOnCloudinay(avatarLocalPath)
   const coverImage = await uploadOnCloudinay(coverImageLocalPath);

    if(!avatar) {
        throw new ApiError('400', "Avatar file is required");
    }else{
        console.log("upload on cloudinary")
    }
    
   const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        username:username.toLowerCase(),
        password
    });
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500, "Something went wronge while registering user")
    }

    return res.status(201).json( 
        new ApiResponse(200,createdUser, "User registered successfully" )
    )


})

const loginUser = asyncHanlder( async (req,res) =>{
    // req -->data
    // userName or email 
    // Find the user 
    // check the password 
    // access and refersh token 
    //Send cookies
    // send success response 

    const { email, username, password } = req.body;
    if ( !(username || email) && !password){
        throw new ApiError(400, "Username or email and password are required");
    }

   const user = await User.findOne({ 
        $or: [{ username}, {email}]
    });

    if(!user){
        throw new ApiError(400, "User does not exist");
    }
   const isPasswordValid =  await user.isPasswordCorrect(password);

   if(!isPasswordValid){
     throw new ApiError(401, "Invalid user password");
   }
  const  { accessToken, refreshToken} =  await  generateAccessAndRefeshTokens(user._id);
  const loggedInUser = await User.findById(user._id).select(" -password -refreshToken");

  const option = {
    httpOnly :true,
    secure: true
  }

  return res
  .status(200)
  .cookie("accessToken",accessToken, option )
  .cookie("refreshToken",refreshToken ,option )
  .json(
    new ApiResponse(
        200,
         {
            user:loggedInUser, accessToken, refreshToken
         },
         "User logged in successfully"
    )
  )


})

const logoutUser = asyncHanlder(async (req,res) =>{

    await User.findByIdAndUpdate(
            req.user._id,
            {
                $set:{
                    refreshToken:undefined 
                }
            },
            {
                new:true
            }     
        );

    const option = {
            httpOnly :true,
            secure: true
        }
    return res
    .status(200)
    .clearCookie("accessToken",option)
    .clearCookie("refreshToken",option)
    .json(new ApiResponse(200, {},"User logout successfully"))
   
})

export {
    registerUser,
    loginUser,
    logoutUser
 };