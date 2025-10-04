import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { DbStorage } from "./db-storage";
import { ExcelParser } from "./excel-parser";
import { TrendsCalculator } from "./trends-calculator";
import { insertMeasurementSchema, insertRecommendationSchema, insertUploadedFileSchema } from "@shared/schema";
import { z } from "zod";

const storage = new DbStorage();
const trendsCalculator = new TrendsCalculator(storage);

const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Fix filename encoding issue (Latin-1 to UTF-8)
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
      'application/vnd.ms-excel.sheet.binary.macroEnabled.12', // .xlsb
    ];
    
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.match(/\.(xlsx|xlsm|xlsb)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Поддерживаются только файлы Excel (XLSX, XLSM, XLSB)'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // RTS routes
  app.get("/api/rts", async (req, res) => {
    try {
      const rtsList = await storage.getRTSList();
      res.json(rtsList);
    } catch (error) {
      res.status(500).json({ message: "Ошибка получения списка РТС", error });
    }
  });

  app.get("/api/rts/stats", async (req, res) => {
    try {
      const stats = await storage.getRTSWithStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Ошибка получения статистики РТС", error });
    }
  });

  app.get("/api/rts/:id", async (req, res) => {
    try {
      const rts = await storage.getRTSById(req.params.id);
      if (!rts) {
        return res.status(404).json({ message: "РТС не найден" });
      }
      res.json(rts);
    } catch (error) {
      res.status(500).json({ message: "Ошибка получения РТС", error });
    }
  });

  // Districts routes
  app.get("/api/districts", async (req, res) => {
    try {
      const { rtsId } = req.query;
      if (rtsId && typeof rtsId === 'string') {
        const districts = await storage.getDistrictsByRTS(rtsId);
        res.json(districts);
      } else {
        res.status(400).json({ message: "Требуется параметр rtsId" });
      }
    } catch (error) {
      res.status(500).json({ message: "Ошибка получения районов", error });
    }
  });

  // CTP routes
  app.get("/api/ctp", async (req, res) => {
    try {
      const { rtsId, districtId, status } = req.query;
      const filters: any = {};
      
      if (rtsId && typeof rtsId === 'string') filters.rtsId = rtsId;
      if (districtId && typeof districtId === 'string') filters.districtId = districtId;
      if (status && typeof status === 'string') filters.status = status;
      
      const ctpList = await storage.getCTPList(filters);
      res.json(ctpList);
    } catch (error) {
      res.status(500).json({ message: "Ошибка получения списка ЦТП", error });
    }
  });

  app.get("/api/ctp/:id", async (req, res) => {
    try {
      const ctp = await storage.getCTPById(req.params.id);
      if (!ctp) {
        return res.status(404).json({ message: "ЦТП не найден" });
      }
      res.json(ctp);
    } catch (error) {
      res.status(500).json({ message: "Ошибка получения ЦТП", error });
    }
  });

  app.get("/api/ctp/:id/measurements", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const measurements = await storage.getMeasurements(req.params.id, start, end);
      res.json(measurements);
    } catch (error) {
      res.status(500).json({ message: "Ошибка получения измерений", error });
    }
  });

  app.get("/api/ctp/:id/control-chart", async (req, res) => {
    try {
      const { period = "60" } = req.query;
      const periodDays = parseInt(period as string, 10);
      
      const data = await storage.getControlChartData(req.params.id, periodDays);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Ошибка получения данных контрольной карты", error });
    }
  });

  // Measurements routes
  app.post("/api/measurements", async (req, res) => {
    try {
      const validatedData = insertMeasurementSchema.parse(req.body);
      const measurement = await storage.createMeasurement(validatedData);
      res.status(201).json(measurement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Неверные данные", errors: error.errors });
      }
      res.status(500).json({ message: "Ошибка создания измерения", error });
    }
  });

  // Statistical parameters routes
  app.post("/api/ctp/:id/calculate-boundaries", async (req, res) => {
    try {
      const boundaries = await storage.calculateControlBoundaries(req.params.id);
      await storage.updateCTPBoundaries(req.params.id, boundaries);
      res.json(boundaries);
    } catch (error) {
      res.status(500).json({ message: "Ошибка расчета контрольных границ", error });
    }
  });

  // Recommendations routes
  app.get("/api/recommendations", async (req, res) => {
    try {
      const { ctpId, type, priority, status } = req.query;
      const filters: any = {};
      
      if (ctpId && typeof ctpId === 'string') filters.ctpId = ctpId;
      if (type && typeof type === 'string') filters.type = type;
      if (priority && typeof priority === 'string') filters.priority = priority;
      if (status && typeof status === 'string') filters.status = status;
      
      const recommendations = await storage.getRecommendations(filters);
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ message: "Ошибка получения рекомендаций", error });
    }
  });

  app.post("/api/recommendations", async (req, res) => {
    try {
      const validatedData = insertRecommendationSchema.parse(req.body);
      const recommendation = await storage.createRecommendation(validatedData);
      res.status(201).json(recommendation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Неверные данные", errors: error.errors });
      }
      res.status(500).json({ message: "Ошибка создания рекомендации", error });
    }
  });

  app.patch("/api/recommendations/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      if (!status || typeof status !== 'string') {
        return res.status(400).json({ message: "Требуется параметр status" });
      }
      
      await storage.updateRecommendationStatus(req.params.id, status);
      res.json({ message: "Статус рекомендации обновлен" });
    } catch (error) {
      res.status(500).json({ message: "Ошибка обновления статуса рекомендации", error });
    }
  });

  // Analytics and trends routes
  app.get("/api/trends/:period", async (req, res) => {
    try {
      const { period } = req.params;
      const { rtsId } = req.query;
      
      if (!['day', 'week', 'month', 'year'].includes(period)) {
        return res.status(400).json({ message: "Неверный период" });
      }
      
      const trends = await storage.getTrendData(period as any, rtsId as string);
      res.json(trends);
    } catch (error) {
      res.status(500).json({ message: "Ошибка получения трендов", error });
    }
  });

  app.get("/api/trends/:period/changes", async (req, res) => {
    try {
      const { period } = req.params;
      
      if (!['week', 'month', 'year'].includes(period)) {
        return res.status(400).json({ message: "Неверный период" });
      }
      
      const changes = await trendsCalculator.getTopChanges(period as any);
      res.json(changes);
    } catch (error) {
      res.status(500).json({ message: "Ошибка получения изменений трендов", error });
    }
  });

  app.get("/api/trends/:period/rts-stats", async (req, res) => {
    try {
      const { period } = req.params;
      
      if (!['week', 'month', 'year'].includes(period)) {
        return res.status(400).json({ message: "Неверный период" });
      }
      
      const stats = await trendsCalculator.getRTSStats(period as any);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Ошибка получения статистики РТС", error });
    }
  });

  app.get("/api/ctp/:id/weekly-change", async (req, res) => {
    try {
      const change = await trendsCalculator.calculateCTPWeeklyChange(req.params.id);
      res.json({ change });
    } catch (error) {
      res.status(500).json({ message: "Ошибка расчета недельного изменения", error });
    }
  });

  app.get("/api/rts/:id/weekly-change", async (req, res) => {
    try {
      const change = await trendsCalculator.calculateRTSWeeklyChange(req.params.id);
      res.json({ change });
    } catch (error) {
      res.status(500).json({ message: "Ошибка расчета недельного изменения РТС", error });
    }
  });

  app.get("/api/trends/overall-change/:period", async (req, res) => {
    try {
      const { period } = req.params;
      
      if (!['week', 'month', 'year'].includes(period)) {
        return res.status(400).json({ message: "Неверный период" });
      }
      
      const change = await trendsCalculator.calculateOverallChange(period as any);
      res.json({ change });
    } catch (error) {
      res.status(500).json({ message: "Ошибка расчета общего изменения", error });
    }
  });

  // File upload routes
  app.post("/api/upload", upload.array('files'), async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ message: "Файлы не были загружены" });
      }

      const uploadResults = [];
      
      for (const file of req.files) {
        const fileData = insertUploadedFileSchema.parse({
          filename: file.filename || file.originalname,
          originalName: file.originalname,
          fileType: file.originalname.split('.').pop()?.toLowerCase() || 'unknown',
          size: file.size,
          status: 'processing',
        });

        const uploadedFile = await storage.createUploadedFile(fileData);
        uploadResults.push(uploadedFile);

        // Process Excel file asynchronously
        processExcelFile(file.buffer, file.originalname, uploadedFile.id).catch(error => {
          console.error('Error processing file:', error);
          storage.updateFileStatus(uploadedFile.id, 'error', 0, [String(error)]);
        });
      }

      res.json({ 
        message: `Загружено ${uploadResults.length} файлов`,
        files: uploadResults 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Неверные данные файла", errors: error.errors });
      }
      res.status(500).json({ message: "Ошибка загрузки файла", error });
    }
  });

  async function processExcelFile(buffer: Buffer, filename: string, uploadId: string) {
    try {
      const parsedSheets = await ExcelParser.parseFile(buffer, filename);
      let totalRecords = 0;
      const errors: string[] = [];

      // Pre-load reference data once
      let ctpList = await storage.getCTPList();
      let rtsList = await storage.getRTSList();
      const ctpCache = new Map(ctpList.map(c => [c.name, c]));
      const defaultRTS = rtsList[0];
      const districts = await storage.getDistrictsByRTS(defaultRTS.id);
      const defaultDistrict = districts[0];

      for (const sheet of parsedSheets) {
        try {
          const measurements = ExcelParser.parseMeasurements(sheet);
          const { valid, errors: validationErrors } = ExcelParser.validateMeasurementData(measurements);
          
          errors.push(...validationErrors);

          // Batch process measurements
          const measurementBatch: any[] = [];
          const affectedCtpIds = new Set<string>();

          for (const measurement of valid) {
            try {
              // Find or create CTP using cache
              let ctp = ctpCache.get(measurement.ctpName);

              if (!ctp) {
                // Extract code from name if possible (e.g., "ЦТП-125" -> "125")
                const codeMatch = measurement.ctpName.match(/\d+/);
                const code = measurement.ctpCode || codeMatch?.[0] || measurement.ctpName;

                const newCtp = await storage.createCTP({
                  name: measurement.ctpName,
                  code: code,
                  rtsId: defaultRTS.id,
                  districtId: defaultDistrict.id,
                  hasMeter: true,
                  meterStatus: 'working',
                });
                
                // Get full CTP with relations
                ctp = await storage.getCTPById(newCtp.id);
                if (ctp) {
                  ctpCache.set(measurement.ctpName, ctp);
                }
              }

              if (!ctp) {
                throw new Error(`Не удалось создать или найти ЦТП ${measurement.ctpName}`);
              }

              measurementBatch.push({
                ctpId: ctp.id,
                date: measurement.date,
                makeupWater: measurement.makeupWater,
                undermix: measurement.undermix,
                flowG1: measurement.flowG1,
                temperature: measurement.temperature,
                pressure: measurement.pressure,
              });

              affectedCtpIds.add(ctp.id);
            } catch (error) {
              errors.push(`Ошибка подготовки данных для ${measurement.ctpName}: ${error}`);
            }
          }

          // Batch insert measurements (insert in chunks of 100)
          const BATCH_SIZE = 100;
          for (let i = 0; i < measurementBatch.length; i += BATCH_SIZE) {
            const chunk = measurementBatch.slice(i, i + BATCH_SIZE);
            for (const meas of chunk) {
              await storage.createMeasurement(meas);
              totalRecords++;
            }
            
            // Log progress every batch
            if (i % 500 === 0 && i > 0) {
              console.log(`📊 Обработано ${i} из ${measurementBatch.length} записей...`);
            }
          }

          console.log(`✅ Обработано ${measurementBatch.length} записей из листа ${sheet.sheetName}`);

          // Update control boundaries only for affected CTPs
          for (const ctpId of Array.from(affectedCtpIds)) {
            const measurements = await storage.getMeasurements(ctpId);
            if (measurements.length >= 10) {
              const boundaries = await storage.calculateControlBoundaries(ctpId);
              await storage.updateCTPBoundaries(ctpId, boundaries);
              await storage.updateStatisticalParams({
                ctpId: ctpId,
                mean: boundaries.cl,
                stdDev: (boundaries.ucl - boundaries.cl) / 3,
                ucl: boundaries.ucl,
                cl: boundaries.cl,
                lcl: boundaries.lcl,
                sampleSize: measurements.length,
              });
            }
          }
        } catch (error) {
          errors.push(`Ошибка обработки листа ${sheet.sheetName}: ${error}`);
        }
      }

      // Update file status
      if (errors.length > 0 && totalRecords === 0) {
        await storage.updateFileStatus(uploadId, 'error', totalRecords, errors);
      } else {
        await storage.updateFileStatus(uploadId, 'completed', totalRecords, errors.length > 0 ? errors : undefined);
      }

      console.log(`🎉 Загрузка завершена! Обработано ${totalRecords} записей`);
    } catch (error) {
      await storage.updateFileStatus(uploadId, 'error', 0, [String(error)]);
    }
  }

  app.get("/api/upload/history", async (req, res) => {
    try {
      const history = await storage.getUploadHistory();
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Ошибка получения истории загрузок", error });
    }
  });

  // Dashboard summary route
  app.get("/api/dashboard/summary", async (req, res) => {
    try {
      const rtsList = await storage.getRTSWithStats();
      const recommendations = await storage.getRecommendations({ status: 'open' });
      const criticalRecommendations = recommendations.filter(r => r.priority === 'critical');
      
      const totalMakeupWater = rtsList.reduce((sum, rts) => sum + rts.totalMakeupWater, 0);
      const totalCTP = rtsList.reduce((sum, rts) => sum + rts.ctpCount, 0);
      const totalCritical = rtsList.reduce((sum, rts) => sum + rts.criticalCount, 0);
      const totalNormal = rtsList.reduce((sum, rts) => sum + rts.normalCount, 0);
      
      const summary = {
        currentMakeupWater: Math.round(totalMakeupWater),
        ctpRequiringAttention: totalCritical + recommendations.filter(r => r.priority === 'warning').length,
        ctpInNormal: Math.round((totalNormal / totalCTP) * 100),
        outOfControlCount: criticalRecommendations.length,
        rtsStats: rtsList,
      };

      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Ошибка получения сводки дашборда", error });
    }
  });

  // Seed database with test data
  app.post("/api/seed", async (req, res) => {
    try {
      const crypto = await import('crypto');
      
      // Create RTS
      const rts1 = await storage.createRTS({
        name: "РТС-1 Центральная",
        code: "RTS-1",
        location: "ул. Ленина, 50"
      });
      
      const rts2 = await storage.createRTS({
        name: "РТС-2 Северная",
        code: "RTS-2",
        location: "пр. Карла Маркса, 20"
      });

      // Create Districts
      const district1 = await storage.createDistrict({
        rtsId: rts1.id,
        name: "Центральный район"
      });

      const district2 = await storage.createDistrict({
        rtsId: rts2.id,
        name: "Северный район"
      });

      // Create CTPs
      const ctps = [];
      for (let i = 1; i <= 10; i++) {
        const rts = i <= 5 ? rts1 : rts2;
        const district = i <= 5 ? district1 : district2;
        
        const ctp = await storage.createCTP({
          name: `ЦТП-${100 + i}`,
          code: `${100 + i}`,
          rtsId: rts.id,
          districtId: district.id,
          hasMeter: true,
          meterStatus: i % 3 === 0 ? 'not_working' : 'working'
        });
        ctps.push(ctp);
      }

      // Create measurements for last 30 days
      const now = new Date();
      for (const ctp of ctps) {
        for (let day = 30; day >= 0; day--) {
          const date = new Date(now);
          date.setDate(date.getDate() - day);
          
          const baseValue = 50 + Math.random() * 30;
          const variation = (Math.random() - 0.5) * 10;
          
          await storage.createMeasurement({
            ctpId: ctp.id,
            date: date,
            makeupWater: baseValue + variation,
            undermix: Math.random() * 5,
            flowG1: 100 + Math.random() * 50,
            temperature: 70 + Math.random() * 20,
            pressure: 4 + Math.random() * 2
          });
        }
      }

      // Calculate control boundaries
      for (const ctp of ctps) {
        const boundaries = await storage.calculateControlBoundaries(ctp.id);
        await storage.updateCTPBoundaries(ctp.id, boundaries);
        
        const measurements = await storage.getMeasurements(ctp.id);
        await storage.updateStatisticalParams({
          ctpId: ctp.id,
          mean: boundaries.cl,
          stdDev: (boundaries.ucl - boundaries.cl) / 3,
          ucl: boundaries.ucl,
          cl: boundaries.cl,
          lcl: boundaries.lcl,
          sampleSize: measurements.length,
        });
      }

      // Create some recommendations
      await storage.createRecommendation({
        ctpId: ctps[0].id,
        type: 'high_consumption',
        priority: 'critical',
        title: 'Высокий расход подпиточной воды',
        description: 'Обнаружен повышенный расход воды, превышающий верхнюю контрольную границу',
        actions: 'Проверить систему на утечки, провести диагностику оборудования',
        status: 'open'
      });

      await storage.createRecommendation({
        ctpId: ctps[1].id,
        type: 'meter_failure',
        priority: 'warning',
        title: 'Неисправность прибора учета',
        description: 'Прибор учета не передает данные более 24 часов',
        actions: 'Проверить связь с прибором учета, при необходимости заменить',
        status: 'open'
      });

      res.json({ 
        message: 'База данных успешно заполнена тестовыми данными',
        created: {
          rts: 2,
          districts: 2,
          ctps: ctps.length,
          measurements: ctps.length * 31,
          recommendations: 2
        }
      });
    } catch (error) {
      console.error('Seed error:', error);
      res.status(500).json({ message: "Ошибка заполнения базы данных", error: String(error) });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
