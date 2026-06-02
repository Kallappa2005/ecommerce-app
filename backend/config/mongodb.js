import mongoose from "mongoose";

const connectDB = async ()=>{

    mongoose.connection.on('connected',() =>{
        console.log("DB connected");
        
    })

    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is not set");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
        dbName: "e-commerce",
    });
}

export default connectDB;