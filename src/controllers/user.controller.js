import { asyncHandler } from "../utils/asynHanlder.js";
import { ApiError} from  "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinay} from "../utils/cloudinary.js";
import { ApiResponse} from "../utils/apiResponse.js";
import  jwt  from "jsonwebtoken";

const generateAccessAndRefeshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.gererateAccessToken();
        const refreshToken = user.gererateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave:false});
        console.log()
         return {
            accessToken, refreshToken
         }
    }catch(error){
        throw new ApiError(500, "Something went wronge while generating refresh token")
    }
}
const registerUser = asyncHandler( async (req,res) =>{

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

const loginUser = asyncHandler( async (req,res) =>{
    // req -->data
    // userName or email 
    // Find the user 
    // check the password 
    // access and refersh token 
    //Send cookies
    // send success response 

    const { email, username, password } = req.body;
    if ( !(username || email) ){
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
   console.log(`accessToken =${accessToken}`);
   console.log(`refreshToken =${refreshToken}`)
  const options = {
    httpOnly :true,
    secure: true
  }

  return res
  .status(200)
  .cookie("accessToken",accessToken, options )
  .cookie("refreshToken",refreshToken ,options )
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

const logoutUser = asyncHandler(async (req,res) =>{

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

const refreshAccesToken = asyncHandler( async (req,res) =>{
    
    const incomingRefreshToken =req?.cookie?.refreshToken || req.body.refreshToken;
    
    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(
                incomingRefreshToken,
                process.env.REFRESH_TOKEN_SECRET
            );
       const user = await User.findById(decodedToken?._id);
       if(!user){
            throw new ApiError(401, "Invalid refresh token");
    
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const  options ={
            httpOnly:true,
            secure:true
        }
       const {accessToken,newRefreshToken} = await generateAccessAndRefeshTokens(user._id);
    
       return res
       .status(200)
       .cookie("accessToken",accessToken, options )
       .cookie("refreshToken",newRefreshToken ,options )
       .json(
        new ApiResponse(
            200,
            { accessToken, refreshToken:newRefreshToken},
            "Access token refreshed"
    
        )
       )
    
    } catch (error) {
        throw new ApiError(401, error?.message || 
            "Invalid refresh token" )
        
    }
    
})


const changeCurrentPassword = asyncHandler( async (req,res) =>{

    const {oldPassword, newPassword} = req.body;
    const user = await User.findById(res.user?._id);
    const isPasswordCorrect =await user.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid password");
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave:false});
   return res.status(200)
    .json(new ApiResponse(200, {}, "Password change succussfully"))


})

const getCurrentUser = asyncHandler(async (req, res) =>{
    return res.status(200)
    .json( new ApiResponse(200, req.user, "Current user fetched successfully"));
})

const updateAccountDetails = asyncHandler( async (req,res) =>{
    const { fullName,email}= req.body;
    if(!fullName || !fullName){
        throw new ApiError(400, "All fields are required");
    }
   const user =  User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                fullName,
                email:email
            }
        },
        {new:true}).select("-password")
    return res.status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));

});


const updateUserAvatar = asyncHandler( async (req, res) =>{
    const avatarLocalPath = req.file?.path;
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }
    const avatar = await uploadOnCloudinay(avatarLocalPath);
    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on avatar");
    }
    const user = await User.findByIdAndUpdate(req.user?._id,
    {
        $set:{
            avatar:avatar.url
        }
    },
    {new:true}).select(" -password")
    return res  
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )


});

const updateUserCoverImage = asyncHandler( async (req, res) =>{
    const coverLocalPath = req.file?.path;
    if(!coverLocalPath){
        throw new ApiError(400,"Cover file is missing")
    }
    const coverImage = await uploadOnCloudinay(coverLocalPath);
    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading on cover image");
    }
    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}).select(" -password")
    return res  
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )

})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccesToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
 };