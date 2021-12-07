const express = require("express");
const router = express.Router();
const fs = require("fs");
const multer = require("multer");
const Documents = require("../../model/Document");
const HTTPError = require("../../errorMessage");
const authenticate = require("../../middlewares/authenticate");
const { uploadFile } = require("../../utils/s3");

const upload = multer({ dest: "uploads/" });

/**
 * @api {post} api/documents/upload Uploads a document
 * @apiName upload_document
 *
 * @apiSuccess {String} success: response status string.
 */

router.post("/upload", authenticate, upload.single("document"), async (req, res) => {
  try {
    if (!file) throw new HTTPError(400, "No file is uploaded");
    const file = req.file;

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
  } catch (err) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message || "Upload Failed" });
  }
});

module.exports = router;