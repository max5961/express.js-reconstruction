import express from "../../../lib/express";
import CategoryController from "./categoryController";

const categoryRouter = new express.Router();

categoryRouter
    .route("/")
    .get(CategoryController.list)
    .post(CategoryController.list);
