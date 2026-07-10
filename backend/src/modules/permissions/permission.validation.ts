import Joi from 'joi';

export const updatePermissionSchema = Joi.object({
  role: Joi.string().required(),
  module: Joi.string().required(),
  actions: Joi.array().items(Joi.string()).required(),
});
