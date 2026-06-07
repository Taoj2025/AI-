import { Type } from '@sinclair/typebox';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

// 创建简历请求体 schema
export const CreateResumeSchema = {
  body: Type.Object({
    title: Type.String({ minLength: 1, maxLength: 200 }),
    companyType: Type.Union([
      Type.Literal('internet'),
      Type.Literal('foreign'),
      Type.Literal('state'),
      Type.Literal('startup'),
      Type.Literal('consulting'),
    ]),
    style: Type.Optional(Type.Union([
      Type.Literal('classic'),
      Type.Literal('modern'),
      Type.Literal('minimal'),
      Type.Literal('creative'),
      Type.Literal('academic'),
      Type.Literal('executive'),
    ])),
    initialData: Type.Optional(Type.Record(Type.String(), Type.Any())),
  }),
};

// 更新简历请求体 schema
export const UpdateResumeSchema = {
  body: Type.Partial(Type.Object({
    title: Type.String({ minLength: 1, maxLength: 200 }),
    data: Type.Record(Type.String(), Type.Any()),
    isPublic: Type.Boolean(),
  })),
  params: Type.Object({
    id: Type.String({ format: 'uuid' }),
  }),
};

// 生成简历版本请求体
export const GenerateVersionSchema = {
  body: Type.Object({
    companyType: Type.Union([
      Type.Literal('internet'),
      Type.Literal('foreign'),
      Type.Literal('state'),
      Type.Literal('startup'),
      Type.Literal('consulting'),
    ]),
    style: Type.Optional(Type.Union([
      Type.Literal('classic'),
      Type.Literal('modern'),
      Type.Literal('minimal'),
      Type.Literal('creative'),
      Type.Literal('academic'),
      Type.Literal('executive'),
    ])),
    modelPreference: Type.Optional(Type.Object({
      provider: Type.String(),
      model: Type.String(),
    })),
  }),
  params: Type.Object({
    id: Type.String({ format: 'uuid' }),
  }),
};
