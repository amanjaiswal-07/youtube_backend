import multer from 'multer';

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, './public/temp'), // Directory to store uploaded files,
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
  })
  
export const upload = multer({ storage });


// import multer from "multer";

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, './public/temp')
//   },
//   filename: function (req, file, cb) {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
//     cb(null, file.originalname + '-' + uniqueSuffix)
//   }
// })

// export const upload = multer({ storage })


//explanation
// This code sets up a multer middleware for handling file uploads in a Node.js application.
// It configures multer to store uploaded files in the './public/temp' directory,
// and names the files with their original name followed by a unique suffix based on the current timestamp

// import multer from "multer";

// // 1) Decide where each file should go
// function chooseFolder(req, file, done) {
//   // done(error, folderPath)
//   done(null, "./public/temp");           // always save to /public/temp
// }

// // 2) Decide the final filename
// function chooseName(req, file, done) {
//   // create something unique so different users don't overwrite each other
//   const randomBits = Math.round(Math.random() * 1e9);
//   const timestamp  = Date.now();         // milliseconds since 1970
//   const newName    = `${file.originalname}-${timestamp}-${randomBits}`;

//   // done(error, fileName)
//   done(null, newName);
// }

// // 3) Plug those two helpers into Multer's "disk storage" engine
// const storage = multer.diskStorage({
//   destination: chooseFolder,
//   filename:    chooseName
// });

// // 4) Export ready‑to‑use middleware
// export const upload = multer({ storage });
