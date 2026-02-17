import mongoose, { Schema } from 'mongoose';
import ConfigurationModelInterface from './types/ConfigurationModelInterface';
import ConfigurationDocumentInterface from './types/ConfigurationInterface';
import ConfigurationInterface from './types/ConfigurationInterface';

const configurationSchema = new Schema<ConfigurationInterface, ConfigurationModelInterface>(
    {
        key: { type: String, required: true },
        userId: { type: String, sparse: true },
        value: { type: Schema.Types.Mixed, required: true },
        createdOnDateTime: { type: Schema.Types.Date, required: true },
        createdBy: { type: String, required: true },
        updatedOnDateTime: { type: Schema.Types.Date },
        updatedBy: { type: String }
    },
    { collection: 'Configurations' }
);

configurationSchema.index(
    { key: 1, userId: 1 },
    { name: 'idx_key_userId', unique: true, sparse: true }
);
configurationSchema.index(
    { userId: 1 },
    { name: 'idx_userId' }
);
configurationSchema.index(
    { key: 1 },
    { name: 'idx_key' }
);


export const ConfigurationModel = mongoose.model<ConfigurationDocumentInterface, ConfigurationModelInterface>(
    'configuration',
    configurationSchema,
);
