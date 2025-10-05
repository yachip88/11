import { z } from "zod";
import type { Prisma } from "@prisma/client";

// Re-export Prisma types for convenience
export type RTS = {
  id: string;
  name: string;
  code: string;
  location: string;
  createdAt: Date;
};

export type District = {
  id: string;
  name: string;
  rtsId: string | null;
  createdAt: Date;
};

export type Vyvod = {
  id: string;
  name: string;
  code: string;
  createdAt: Date;
};

export type CTP = {
  id: string;
  name: string;
  code: string;
  fullName: string | null;
  city: string | null;
  address: string | null;
  yearBuilt: number | null;
  rtsId: string | null;
  districtId: string | null;
  vyvodId: string | null;
  ucl: number | null;
  cl: number | null;
  lcl: number | null;
  hasMeter: boolean;
  meterStatus: string;
  status: string | null;
  commentPTU: string | null;
  commentRTS: string | null;
  commentSKIPiA: string | null;
  av365G1: number | null;
  av365G2: number | null;
  min730: number | null;
  min365: number | null;
  min30: number | null;
  min7: number | null;
  percentFromG1: number | null;
  normativMinenergo: number | null;
  createdAt: Date;
};

export type Measurement = {
  id: string;
  ctpId: string;
  date: Date;
  makeupWater: number;
  undermix: number;
  flowG1: number | null;
  temperature: number | null;
  pressure: number | null;
  createdAt: Date;
};

export type StatisticalParams = {
  id: string;
  ctpId: string;
  mean: number;
  stdDev: number;
  ucl: number;
  cl: number;
  lcl: number;
  sampleSize: number;
  calculatedAt: Date;
};

export type Recommendation = {
  id: string;
  ctpId: string;
  type: string;
  priority: string;
  title: string;
  description: string;
  actions: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UploadedFile = {
  id: string;
  filename: string;
  originalName: string;
  fileType: string;
  size: number;
  status: string;
  recordsProcessed: number;
  errors: string | null;
  uploadedAt: Date;
};

// Zod schemas for validation
export const insertRtsSchema = z.object({
  name: z.string(),
  code: z.string(),
  location: z.string(),
});

export const insertDistrictSchema = z.object({
  name: z.string(),
  rtsId: z.string().optional().nullable(),
});

export const insertVyvodSchema = z.object({
  name: z.string(),
  code: z.string(),
});

export const insertCtpSchema = z.object({
  name: z.string(),
  code: z.string(),
  fullName: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  yearBuilt: z.number().optional().nullable(),
  rtsId: z.string().optional().nullable(),
  districtId: z.string().optional().nullable(),
  vyvodId: z.string().optional().nullable(),
  ucl: z.number().optional().nullable(),
  cl: z.number().optional().nullable(),
  lcl: z.number().optional().nullable(),
  hasMeter: z.boolean().optional(),
  meterStatus: z.string().optional(),
  status: z.string().optional().nullable(),
  commentPTU: z.string().optional().nullable(),
  commentRTS: z.string().optional().nullable(),
  commentSKIPiA: z.string().optional().nullable(),
  av365G1: z.number().optional().nullable(),
  av365G2: z.number().optional().nullable(),
  min730: z.number().optional().nullable(),
  min365: z.number().optional().nullable(),
  min30: z.number().optional().nullable(),
  min7: z.number().optional().nullable(),
  percentFromG1: z.number().optional().nullable(),
  normativMinenergo: z.number().optional().nullable(),
});

export const insertMeasurementSchema = z.object({
  ctpId: z.string(),
  date: z.coerce.date(),
  makeupWater: z.number(),
  undermix: z.number().optional(),
  flowG1: z.number().optional().nullable(),
  temperature: z.number().optional().nullable(),
  pressure: z.number().optional().nullable(),
});

export const insertStatisticalParamsSchema = z.object({
  ctpId: z.string(),
  mean: z.number(),
  stdDev: z.number(),
  ucl: z.number(),
  cl: z.number(),
  lcl: z.number(),
  sampleSize: z.number(),
});

export const insertRecommendationSchema = z.object({
  ctpId: z.string(),
  type: z.string(),
  priority: z.string(),
  title: z.string(),
  description: z.string(),
  actions: z.string().optional().nullable(),
  status: z.string().optional(),
});

export const insertUploadedFileSchema = z.object({
  filename: z.string(),
  originalName: z.string(),
  fileType: z.string(),
  size: z.number(),
  status: z.string().optional(),
  recordsProcessed: z.number().optional(),
  errors: z.string().optional().nullable(),
});

// Insert types
export type InsertRTS = z.infer<typeof insertRtsSchema>;
export type InsertDistrict = z.infer<typeof insertDistrictSchema>;
export type InsertVyvod = z.infer<typeof insertVyvodSchema>;
export type InsertCTP = z.infer<typeof insertCtpSchema>;
export type InsertMeasurement = z.infer<typeof insertMeasurementSchema>;
export type InsertStatisticalParams = z.infer<
  typeof insertStatisticalParamsSchema
>;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;

// Extended types for API responses
export type CTPWithDetails = CTP & {
  rts: RTS | null;
  district: District | null;
  vyvod: Vyvod | null;
  latestMeasurement?: Measurement;
  statisticalParams?: StatisticalParams;
  recommendations: Recommendation[];
};

export type RTSWithStats = RTS & {
  totalMakeupWater: number;
  ctpCount: number;
  criticalCount: number;
  warningCount: number;
  normalCount: number;
};

export type TrendData = {
  date: string;
  value: number;
  rtsId?: string;
  ctpId?: string;
};

export type ControlChartData = {
  date: string;
  value: number;
  ucl: number;
  cl: number;
  lcl: number;
  isOutOfControl: boolean;
  controlType: "normal" | "upper" | "lower";
};
