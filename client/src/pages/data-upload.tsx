import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  CloudUpload,
  Lightbulb,
  FileSpreadsheet,
  File,
  AlertCircle,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { UploadedFile } from "@shared/schema";

export default function DataUpload() {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [selectedModelFile, setSelectedModelFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: uploadHistory, isLoading } = useQuery<UploadedFile[]>({
    queryKey: ["/api/upload/history"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      const response = await apiRequest("POST", "/api/upload", formData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Файлы загружены успешно",
        description: "Обработка файлов начата",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/upload/history"] });
      setSelectedFiles(null);
      setUploadProgress({});
    },
    onError: (error) => {
      toast({
        title: "Ошибка загрузки",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const importModelMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiRequest("POST", "/api/import-model", formData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Модель импортирована успешно",
        description: `Импортировано: ${data.ctpCount} ЦТП, ${data.measurementCount} измерений, ${data.vyvodCount} выводов`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ctp"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rts"] });
      setSelectedModelFile(null);
    },
    onError: (error) => {
      toast({
        title: "Ошибка импорта модели",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleModelFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (["xlsm"].includes(extension || "")) {
        setSelectedModelFile(file);
      } else {
        toast({
          title: "Неподдерживаемый файл",
          description:
            "Для импорта модели поддерживается только файл Model_2.5.20.xlsm",
          variant: "destructive",
        });
      }
    }
  };

  const handleImportModel = () => {
    if (selectedModelFile) {
      importModelMutation.mutate(selectedModelFile);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Validate file types
      const validFiles = Array.from(files).filter((file) => {
        const extension = file.name.split(".").pop()?.toLowerCase();
        return ["xlsx", "xlsm", "xlsb"].includes(extension || "");
      });

      if (validFiles.length !== files.length) {
        toast({
          title: "Неподдерживаемые файлы",
          description: "Поддерживаются только файлы Excel (XLSX, XLSM, XLSB)",
          variant: "destructive",
        });
      }

      if (validFiles.length > 0) {
        const fileList = new DataTransfer();
        validFiles.forEach((file) => fileList.items.add(file));
        setSelectedFiles(fileList.files);
      }
    }
  };

  const handleUpload = () => {
    if (selectedFiles && selectedFiles.length > 0) {
      // Simulate progress for UX
      Array.from(selectedFiles).forEach((file, index) => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 20;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
          }
          setUploadProgress((prev) => ({ ...prev, [file.name]: progress }));
        }, 200);
      });

      uploadMutation.mutate(selectedFiles);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const fakeEvent = {
        target: { files },
      } as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(fakeEvent);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const getFileTypeIcon = (fileType: string) => {
    return <FileSpreadsheet className="w-4 h-4 mr-2" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <StatusBadge status="normal">Успешно</StatusBadge>;
      case "processing":
        return <StatusBadge status="info">Обработка</StatusBadge>;
      case "error":
        return <StatusBadge status="critical">Ошибка</StatusBadge>;
      default:
        return <StatusBadge status="warning">Неизвестно</StatusBadge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-48 bg-muted animate-pulse rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Загрузка данных</h3>
        <p className="text-muted-foreground text-sm">
          Импорт данных из Excel файлов (XLSM, XLSX, XLSB) с показаниями
          приборов учета
        </p>
      </div>

      {/* Model Import Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileSpreadsheet className="w-5 h-5 mr-2 text-blue-600" />
            Импорт аналитической модели Model_2.5.20.xlsm
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start space-x-3">
                <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                    Импорт полной аналитической модели
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Загрузите файл Model_2.5.20.xlsm для импорта полного
                    справочника ЦТП с историческими данными, выводами,
                    комментариями и расширенной статистикой.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  id="modelFileInput"
                  type="file"
                  accept=".xlsm"
                  onChange={handleModelFileSelect}
                  data-testid="model-file-input"
                  className="cursor-pointer"
                />
              </div>
              <Button
                onClick={handleImportModel}
                disabled={!selectedModelFile || importModelMutation.isPending}
                data-testid="button-import-model"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {importModelMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Импорт...
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-4 h-4 mr-2" />
                    Импортировать модель
                  </>
                )}
              </Button>
            </div>

            {selectedModelFile && (
              <div className="flex items-center p-2 bg-muted rounded">
                <FileSpreadsheet className="w-4 h-4 mr-2 text-blue-600" />
                <span className="text-sm">{selectedModelFile.name}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({(selectedModelFile.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CloudUpload className="w-5 h-5 mr-2 text-primary" />
              Загрузка новых данных
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer transition-all hover:border-primary hover:bg-primary/5"
              onClick={() => document.getElementById("fileInput")?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              data-testid="upload-zone"
            >
              <CloudUpload className="w-12 h-12 mx-auto mb-4 text-primary" />
              <p className="font-semibold mb-2">
                Перетащите файлы сюда или нажмите для выбора
              </p>
              <p className="text-sm text-muted-foreground">
                Поддерживаются форматы: XLSM, XLSX, XLSB
              </p>
            </div>

            <Input
              id="fileInput"
              type="file"
              multiple
              accept=".xlsm,.xlsx,.xlsb"
              className="hidden"
              onChange={handleFileSelect}
              data-testid="file-input"
            />

            {selectedFiles && selectedFiles.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Выбранные файлы:</h4>
                <div className="space-y-2">
                  {Array.from(selectedFiles).map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <div className="flex items-center">
                        <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({(file.size / 1024 / 1024).toFixed(1)} MB)
                        </span>
                      </div>
                      {uploadProgress[file.name] && (
                        <div className="w-32">
                          <Progress
                            value={uploadProgress[file.name]}
                            className="h-2"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              className="w-full mt-4"
              onClick={handleUpload}
              disabled={
                !selectedFiles ||
                selectedFiles.length === 0 ||
                uploadMutation.isPending
              }
              data-testid="button-upload"
            >
              {uploadMutation.isPending ? (
                <>
                  <div className="loading-spinner mr-2" />
                  Обработка...
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4 mr-2" />
                  Обработать загруженные файлы
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lightbulb className="w-5 h-5 mr-2 text-primary" />
              Информация о загрузке
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-4">
              <p>Система поддерживает следующие типы файлов:</p>
              <ul className="ml-6 space-y-2">
                <li className="flex items-center">
                  <File className="w-4 h-4 mr-2" />
                  <strong>Показания ОДПУ</strong> - приборы учета тепловой
                  энергии
                </li>
                <li className="flex items-center">
                  <File className="w-4 h-4 mr-2" />
                  <strong>Свод журнала</strong> - сводные данные по РТС
                </li>
                <li className="flex items-center">
                  <File className="w-4 h-4 mr-2" />
                  <strong>Сводная ведомость</strong> - данные по абонентам
                </li>
                <li className="flex items-center">
                  <File className="w-4 h-4 mr-2" />
                  <strong>Аналитическая модель</strong> - расчетные параметры
                </li>
              </ul>
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-start">
                  <Lightbulb className="w-4 h-4 mr-2 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    После загрузки данные автоматически обрабатываются и
                    интегрируются в систему анализа.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload History */}
      <Card>
        <CardHeader>
          <CardTitle>История загрузок</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table" data-testid="upload-history">
              <thead>
                <tr>
                  <th>Дата загрузки</th>
                  <th>Тип файла</th>
                  <th>Имя файла</th>
                  <th>Размер</th>
                  <th>Статус</th>
                  <th>Записей обработано</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {uploadHistory && uploadHistory.length > 0 ? (
                  uploadHistory.map((file) => (
                    <tr key={file.id} data-testid={`upload-row-${file.id}`}>
                      <td>
                        {file.uploadedAt
                          ? new Date(file.uploadedAt).toLocaleString("ru-RU")
                          : "—"}
                      </td>
                      <td className="flex items-center">
                        {getFileTypeIcon(file.fileType)}
                        {file.fileType?.toUpperCase() || "—"}
                      </td>
                      <td
                        className="max-w-xs truncate"
                        title={file.originalName || ""}
                      >
                        {file.originalName || "—"}
                      </td>
                      <td>{(file.size / 1024 / 1024).toFixed(1)} MB</td>
                      <td>{getStatusBadge(file.status)}</td>
                      <td>{file.recordsProcessed || 0}</td>
                      <td>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-details-${file.id}`}
                        >
                          Детали
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  // Mock data when no uploads exist
                  <>
                    <tr>
                      <td>29.01.2025 11:32</td>
                      <td className="flex items-center">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Показания ОДПУ
                      </td>
                      <td>Показания ОДПУ 29.09.2025 - 02.10.2025.xlsb</td>
                      <td>2.8 MB</td>
                      <td>
                        <StatusBadge status="normal">Успешно</StatusBadge>
                      </td>
                      <td>347</td>
                      <td>
                        <Button variant="outline" size="sm">
                          Детали
                        </Button>
                      </td>
                    </tr>
                    <tr>
                      <td>28.01.2025 16:45</td>
                      <td className="flex items-center">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Свод журнала
                      </td>
                      <td>Свод журнала 2024.xlsm</td>
                      <td>5.2 MB</td>
                      <td>
                        <StatusBadge status="normal">Успешно</StatusBadge>
                      </td>
                      <td>8,760</td>
                      <td>
                        <Button variant="outline" size="sm">
                          Детали
                        </Button>
                      </td>
                    </tr>
                    <tr>
                      <td>28.01.2025 09:15</td>
                      <td className="flex items-center">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Аналитическая модель
                      </td>
                      <td>Model_2.5.20.xlsm</td>
                      <td>12.5 MB</td>
                      <td>
                        <StatusBadge status="normal">Успешно</StatusBadge>
                      </td>
                      <td>15,234</td>
                      <td>
                        <Button variant="outline" size="sm">
                          Детали
                        </Button>
                      </td>
                    </tr>
                    <tr>
                      <td>27.01.2025 14:20</td>
                      <td className="flex items-center">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Сводная ведомость
                      </td>
                      <td>
                        Сводная ведомость по абонентам за февраль 2025.xlsx
                      </td>
                      <td>1.9 MB</td>
                      <td>
                        <StatusBadge status="warning">
                          Предупреждения
                        </StatusBadge>
                      </td>
                      <td>423</td>
                      <td>
                        <Button variant="outline" size="sm">
                          Детали
                        </Button>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
