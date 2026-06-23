import productModel from "../models/productModel.js";
import uploadToS3 from "../services/s3Upload.js";
import logger from "../utils/logger.js";

const addProduct = async (req, res) => {
  try {
    const { name, description, price, category, subCategory, sizes, bestseller } =
      req.body;
    const image1 = req.files.image1 && req.files.image1[0];
    const image2 = req.files.image2 && req.files.image2[0];
    const image3 = req.files.image3 && req.files.image3[0];
    const image4 = req.files.image4 && req.files.image4[0];

    const images = [image1, image2, image3, image4].filter(
      (item) => item !== undefined
    );

    if (images.length === 0) {
      return res.json({ success: false, message: "At least one image is required" });
    }

    const imagesUrl = await Promise.all(
      images.map((item) => uploadToS3(item))
    );

    const productData = {
      name,
      description,
      category,
      price: Number(price),
      subCategory,
      bestseller: bestseller === "true",
      sizes: JSON.parse(sizes),
      image: imagesUrl,
      date: Date.now(),
    };

    const product = new productModel(productData);
    await product.save();

    res.json({ success: true, message: "Product added" });
  } catch (error) {
    logger.error("addProduct failed", { error: error.message });
    res.json({ success: false, message: error.message });
  }
};

const listProduct = async (req, res) => {
  try {
    const products = await productModel.find({});
    res.json({ success: true, products });
  } catch (error) {
    logger.error("listProduct failed", { error: error.message });
    res.json({ success: false, message: error.message });
  }
};

const removeProduct = async (req, res) => {
  try {
    await productModel.findByIdAndDelete(req.body.id);
    res.json({ success: true, message: "Product removed" });
  } catch (error) {
    logger.error("removeProduct failed", { error: error.message });
    res.json({ success: false, message: error.message });
  }
};

const singleProduct = async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await productModel.findById(productId);
    res.json({ success: true, product });
  } catch (error) {
    logger.error("singleProduct failed", { error: error.message });
    res.json({ success: false, message: error.message });
  }
};

export { listProduct, addProduct, removeProduct, singleProduct };
