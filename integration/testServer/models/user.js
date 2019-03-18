module.exports = function (mongoose) {
    let modelName = "user";
    let Types = mongoose.Schema.Types;
    let Schema = new mongoose.Schema({
        email: {
            type: Types.String,
            required: true,
            unique: true
        },
        name: {
            type: Types.String,
            required: true
        },
        password: {
            type: Types.String,
            required: true,
            exclude: true,
            allowOnUpdate: false
        }
    });

    Schema.statics = {
        collectionName: modelName,
        routeOptions: {}
    };

    return Schema;
};
