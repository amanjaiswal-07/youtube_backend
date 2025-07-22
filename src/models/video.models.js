import mongoose ,{ Schema } from 'mongoose';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';

const videoSchema = new Schema(
    {
        videoFile:{
            url:{
                type: String, // URL to the video file from cloudinary
                required: true
            },
            public_id:{
                type: String,
                required: true
            }

        },
        thumbnail:{
            url:{
                type: String, // URL to the video file from cloudinary
                required: true
            },
            public_id:{
                type: String,
                required: true
            }
        },
        title:{
            type: String,
            required: true,
        },
        description:{
            type: String,
            required: true,
        },
        duration:{
            type: Number, // from cloudinary
            required: true,
        },
        views:{
            type: Number,
            default: 0, 
        },
        isPublished:{
            type: Boolean,
            default: true
        },
        owner:{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }

    },{timestamps: true});

videoSchema.index({ title: 'text', description: 'text' });
// That line creates a special text index in your database, which makes searching for words inside the title and description fields extremely fast. This $text operator is a special, high-performance search command. It will only work if you have told MongoDB which fields it's allowed to search. The line videoSchema.index({ title: 'text', description: 'text' }) is that instruction.Without it, MongoDB would have to read the title and description of every single video in your database for every search, which is incredibly slow. With the index, the search is almost instant.
videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model('Video', videoSchema)

