const asyncHanlder = (requestHandler)=>{
    return (req,res,next) =>{
        Promise.resolve(requestHandler(req,res,next)).catch( (err) => next(err))
    }

}

export { asyncHanlder}

// const asyncHanlder = (fn) => async(req,res,next) => { 
//     try{
        
//     }catch(error){
//         res.status(error.code || 500).json({
//             success: false,
//             message:error.message
//         })
//     }
// }