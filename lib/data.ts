import { Op, type FindOptions, type Model, type ModelStatic, type Order } from "sequelize";
import { sequelize } from "@/database";
import { defineModels } from "@/models";

export const models = defineModels(sequelize);

type ModelKey = keyof typeof models;
type QueryArgs = {
  where?: Record<string, any>;
  include?: Record<string, any>;
  orderBy?: Record<string, "asc" | "desc">;
  take?: number;
  select?: Record<string, boolean>;
  data?: Record<string, any>;
};

const modelMap = {
  user: "User",
  department: "Department",
  project: "Project",
  projectMember: "ProjectMember",
  task: "Task",
  taskFollowUp: "TaskFollowUp",
  meeting: "Meeting",
  eODReport: "EODReport",
  notification: "Notification",
  auditLog: "AuditLog"
} satisfies Record<string, ModelKey>;

function normalizeDate(value: any) {
  if (!(value instanceof Date)) return value;
  return value.toISOString().slice(0, 10);
}

function cleanData(data: Record<string, any> = {}) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

function translateWhere(where?: Record<string, any>): Record<string, any> | undefined {
  if (!where) return undefined;
  return Object.fromEntries(
    Object.entries(where)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => {
        if (value instanceof Date) return [key, normalizeDate(value)];
        if (!value || typeof value !== "object" || Array.isArray(value)) return [key, value];
        const translated: Record<symbol, any> = {};
        if ("in" in value) translated[Op.in] = value.in;
        if ("notIn" in value) translated[Op.notIn] = value.notIn;
        if ("not" in value) translated[Op.ne] = value.not;
        if ("lt" in value) translated[Op.lt] = normalizeDate(value.lt);
        if ("lte" in value) translated[Op.lte] = normalizeDate(value.lte);
        if ("gt" in value) translated[Op.gt] = normalizeDate(value.gt);
        if ("gte" in value) translated[Op.gte] = normalizeDate(value.gte);
        return [key, translated];
      })
  );
}

function toPlain(row: any): any {
  if (!row) return row;
  if (Array.isArray(row)) return row.map(toPlain);
  if (typeof row.get === "function") return row.get({ plain: true });
  return row;
}

function attributesFromSelect(select?: Record<string, boolean>) {
  if (!select) return undefined;
  return Object.entries(select).filter(([, enabled]) => enabled).map(([key]) => key);
}

function includeFor(model: ModelStatic<Model>, include?: Record<string, any>): FindOptions["include"] {
  if (!include) return undefined;
  return Object.entries(include).map(([as, nested]) => {
    const association = model.associations[as];
    if (!association) return null;
    const target = association.target as ModelStatic<Model>;
    const nestedValue = nested === true ? {} : nested;
    const nestedInclude = includeFor(target, nestedValue?.include);
    return {
      model: target,
      as,
      attributes: attributesFromSelect(nestedValue?.select),
      ...(nestedInclude ? { include: nestedInclude } : {})
    };
  }).filter(Boolean) as FindOptions["include"];
}

function makeOrder(orderBy?: Record<string, "asc" | "desc">): Order | undefined {
  if (!orderBy) return undefined;
  return Object.entries(orderBy).map(([field, direction]) => [field, direction.toUpperCase()]);
}

function makeDelegate(model: ModelStatic<Model>) {
  return {
    async findFirst(args: QueryArgs = {}) {
      return toPlain(await model.findOne({
        where: translateWhere(args.where),
        include: includeFor(model, args.include),
        attributes: attributesFromSelect(args.select),
        order: makeOrder(args.orderBy)
      }));
    },
    async findUnique(args: QueryArgs = {}) {
      return this.findFirst(args);
    },
    async findUniqueOrThrow(args: QueryArgs = {}) {
      const row = await this.findUnique(args);
      if (!row) throw new Error(`${model.name} not found`);
      return row;
    },
    async findMany(args: QueryArgs = {}) {
      return toPlain(await model.findAll({
        where: translateWhere(args.where),
        include: includeFor(model, args.include),
        attributes: attributesFromSelect(args.select),
        order: makeOrder(args.orderBy),
        limit: args.take
      }));
    },
    async create(args: QueryArgs) {
      const row = await model.create(cleanData(args.data) as any);
      if (args.include) {
        return this.findUnique({ where: { id: (row as any).get("id") }, include: args.include });
      }
      return toPlain(row);
    },
    async update(args: QueryArgs) {
      const data = cleanData({ ...args.data, updated_at: new Date() });
      await model.update(data, { where: translateWhere(args.where) ?? {} });
      return this.findUniqueOrThrow({ where: args.where, include: args.include });
    },
    async updateMany(args: QueryArgs) {
      const [count] = await model.update(cleanData({ ...args.data, updated_at: new Date() }), { where: translateWhere(args.where) ?? {} });
      return { count };
    },
    async count(args: QueryArgs = {}) {
      return model.count({ where: translateWhere(args.where) });
    }
  };
}

export const db = Object.fromEntries(
  Object.entries(modelMap).map(([delegateName, modelName]) => [delegateName, makeDelegate(models[modelName] as ModelStatic<Model>)])
) as Record<keyof typeof modelMap, ReturnType<typeof makeDelegate>>;
