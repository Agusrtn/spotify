const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

const app = express()

app.use(cors())
app.use(express.json())

mongoose.connect("TU_URL_MONGODB")

const User = mongoose.model("User", {
  username: String,
  password: String,
  role: String,
  accessDenied: Boolean
})

app.post("/login", async (req,res)=>{

 const {username,password} = req.body

 const user = await User.findOne({username})

 if(!user){
   return res.status(401).json({error:"user not found"})
 }

 const valid = await bcrypt.compare(password,user.password)

 if(!valid){
   return res.status(401).json({error:"wrong password"})
 }

 if(user.accessDenied){
   return res.status(403).json({error:"banned"})
 }

 const token = jwt.sign(
   {id:user._id,role:user.role},
   "RTN_SECRET"
 )

 res.json({
   token,
   user:{
    username:user.username,
    role:user.role
   }
 })

})

app.listen(3000,()=>{
 console.log("server running")
})

module.exports = app;