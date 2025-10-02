import { DbStorage } from './db-storage';

async function seed() {
  const storage = new DbStorage();

  console.log('Seeding database...');

  // Create RTS (Regional Thermal Stations)
  const rts1 = await storage.createRTS({
    name: "ТЭЦ-5",
    code: "РТС-1",
    location: "Правый берег",
  });

  const rts2 = await storage.createRTS({
    name: "ТЭЦ-3",
    code: "РТС-2",
    location: "Левый берег",
  });

  const rts3 = await storage.createRTS({
    name: "ТЭЦ-2",
    code: "РТС-3",
    location: "Правый берег",
  });

  const rts4 = await storage.createRTS({
    name: "ТЭЦ-4",
    code: "РТС-4",
    location: "Левый берег",
  });

  const rts5 = await storage.createRTS({
    name: "КРК",
    code: "РТС-5",
    location: "Правый берег",
  });

  console.log('Created 5 RTS');

  // Create Districts
  const district1 = await storage.createDistrict({
    name: "Ленинский микрорайон",
    rtsId: rts1.id,
  });

  const district2 = await storage.createDistrict({
    name: "Советский микрорайон",
    rtsId: rts2.id,
  });

  const district3 = await storage.createDistrict({
    name: "Кировский микрорайон",
    rtsId: rts4.id,
  });

  console.log('Created 3 districts');

  // Create CTPs with control boundaries
  const ctp125 = await storage.createCTP({
    name: "ЦТП-125",
    code: "125",
    rtsId: rts1.id,
    districtId: district1.id,
    ucl: 36.1,
    cl: 32.5,
    lcl: 28.2,
    hasMeter: true,
    meterStatus: "working",
  });

  const ctp156 = await storage.createCTP({
    name: "ЦТП-156",
    code: "156",
    rtsId: rts4.id,
    districtId: district3.id,
    ucl: 42.5,
    cl: 38.2,
    lcl: 33.5,
    hasMeter: true,
    meterStatus: "working",
  });

  const ctp234 = await storage.createCTP({
    name: "ЦТП-234",
    code: "234",
    rtsId: rts2.id,
    districtId: district2.id,
    ucl: 24.8,
    cl: 21.2,
    lcl: 17.9,
    hasMeter: true,
    meterStatus: "working",
  });

  console.log('Created 3 CTPs');

  // Create some historical measurements
  const baseDate = new Date('2025-09-25');
  const ctps = [ctp125, ctp156, ctp234];
  
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const measurementDate = new Date(baseDate);
    measurementDate.setDate(baseDate.getDate() + dayOffset);
    
    for (const ctp of ctps) {
      const baseMakeup = ctp.cl || 30;
      const variation = (Math.random() - 0.5) * 10;
      
      await storage.createMeasurement({
        ctpId: ctp.id,
        date: measurementDate,
        makeupWater: baseMakeup + variation,
        undermix: (Math.random() - 0.5) * 4,
        flowG1: 45 + (Math.random() - 0.5) * 10,
        temperature: 70 + (Math.random() - 0.5) * 10,
        pressure: 6 + (Math.random() - 0.5) * 2,
      });
    }
  }

  console.log('Created 90 measurements (30 days × 3 CTPs)');

  // Calculate and save statistical parameters
  for (const ctp of ctps) {
    const boundaries = await storage.calculateControlBoundaries(ctp.id);
    
    await storage.updateStatisticalParams({
      ctpId: ctp.id,
      mean: boundaries.cl,
      stdDev: (boundaries.ucl - boundaries.cl) / 3,
      ucl: boundaries.ucl,
      cl: boundaries.cl,
      lcl: boundaries.lcl,
      sampleSize: 30,
    });
    
    // Update CTP with calculated boundaries
    await storage.updateCTPBoundaries(ctp.id, boundaries);
  }

  console.log('Calculated statistical parameters for all CTPs');

  // Create some recommendations
  await storage.createRecommendation({
    ctpId: ctp125.id,
    type: 'leak_inspection',
    priority: 'critical',
    title: 'ЦТП-125 (РТС-1, Ленинский)',
    description: 'Устойчивое превышение подпитки за пределами верхней контрольной границы',
    actions: JSON.stringify([
      'Провести инспекцию на предмет утечек теплоносителя',
      'Проверить работоспособность приборов учета',
      'Проверить параметры работы подпиточных насосов',
      'При выявлении утечек - организовать устранение'
    ]),
    status: 'new',
  });

  await storage.createRecommendation({
    ctpId: ctp156.id,
    type: 'meter_check',
    priority: 'warning',
    title: 'ЦТП-156 (РТС-4, Кировский)',
    description: 'Превышение подпитки сопоставимое с расходом G1',
    actions: JSON.stringify([
      'ПРИОРИТЕТ: Проверить приборы учета расхода теплоносителя',
      'Провести поверку счетчиков',
      'Проверить корректность передачи данных в АСКУЭ',
      'При необходимости - восстановить работоспособность приборов учета'
    ]),
    status: 'new',
  });

  console.log('Created 2 recommendations');

  // Create upload history entry
  await storage.createUploadedFile({
    filename: 'seed_data.xlsx',
    originalName: 'Показания ОДПУ 25.09.2025 - 25.10.2025.xlsx',
    fileType: 'xlsx',
    size: Math.round(1024 * 1024 * 2.8),
    status: 'completed',
    recordsProcessed: 90,
  });

  console.log('Created upload history entry');
  console.log('Database seeded successfully!');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Error seeding database:', error);
  process.exit(1);
});
