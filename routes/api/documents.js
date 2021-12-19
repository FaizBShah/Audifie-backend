const fs = require("fs");
const path = require("path");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const Documents = require("../../model/Document");
const HTTPError = require("../../errorMessage");
const authenticate = require("../../middlewares/authenticate");
const { uploadFile, deleteFile } = require("../../utils/s3");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: function (req, file, cb) {
    console.log(file);
    cb(null, file.originalname);
  }
})

const upload = multer({ storage });

/**
 * @api {get} api/documents Gets all documents of a particular user
 * @apiName get_all_documents
 *
 * @apiSuccess {Object} documents: Documents of an user.
 */

router.get("/", authenticate, (req, res) => {
  Documents.find({ user: req.user.id }, 'user title isFavourite processing date')
    .populate('user', ['name'])
    .sort({ date: -1 })
    .then((documents) => res.status(200).json(documents))
    .catch(() => res.status(400).json({ success: false, message: "Failed to get documents" }));
})

/**
 * @api {post} api/documents/upload Uploads a document
 * @apiName upload_document
 *
 * @apiSuccess {String} success: response status string.
 */

router.post("/upload", authenticate, upload.single("document"), async (req, res) => {
  try {
    const file = req.file;

    if (!file) throw new HTTPError(400, "No document is uploaded");

    const newDocument = new Documents({
      user: req.user.id,
      title: file.filename
    });

    newDocument.save()
      .then((document) => {
        file.id = document.id;

        uploadFile(file, (err) => {
          if (err) {
            Documents.findByIdAndRemove(document.id)
              .then(() => {
                return res.status(500).json({ success: false, message: "Upload Failed" });
              })
              .catch(() => {
                return res.status(500).json({ success: false, message: "Upload Failed" });
              });
          }
    
          // Deleting the file after uploading to AWS
          fs.unlinkSync(req.file.path);

          res.status(200).json({ success: true });
        });
      })
      .catch((err) => {
        res.status(err.statusCode || 400).json({ success: false, message: err.message || "Upload Failed" });
      })
  } catch (err) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message || "Upload Failed" });
  }
})

/**
 * @api {post} api/documents/edit/:id Edits a document
 * @apiName edit_document
 *
 * @apiSuccess {Object} document: Updated document object.
 */

router.post("/edit/:id", authenticate, async (req, res) => {
  try {
    if (!req.params.id) throw new HTTPError(400, "Invalid File");

    const { title, isFavourite } = req.body;

    const editFields = {};

    if (title) editFields.title = title;
    if (isFavourite === true || isFavourite === false) editFields.isFavourite = isFavourite;

    const document = await Documents.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: editFields },
      { new: true }
    );

    if (!document) throw new HTTPError(400, "Unable to perform task");

    res.status(200).json(document);
  } catch(err) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message || "Unable to perform task" });
  }
})

/**
 * @api {delete} api/documents/delete/:id Deletes a document
 * @apiName delete_document
 *
 * @apiSuccess {String} success: Response success string.
 */

router.delete("/delete/:id", authenticate, async (req, res) => {
  try {
    if (!req.params.id) throw new HTTPError(400, "Invalid File");

    const document = await Documents.findById(req.params.id);

    if (!document) throw new HTTPError(400, "File not found");

    if (!document.processing) throw new HTTPError(400, "File is currently getting processed");

    deleteFile(req.params.id, (err) => {
      if (err) return res.status(500).json({ success: false, message: "Failed to delete file" });

      Documents.findByIdAndRemove(req.params.id)
        .then(() => res.status(200).json({ success: true }))
        .catch(() => res.status(500).json({ success: false, message: "Failed to delete file" }));
    })
  } catch (err) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message || "Failed to delete file" });
  }
})

module.exports = router;