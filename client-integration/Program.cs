using System;
using System.Management;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace PitchLauncher
{
    class Program
    {
        // Настройки - замените на ваши данные
        private const string API_URL = "https://your-vercel-app.vercel.app/api/check-launch";
        private const string USER_ID = "ваш_user_id_из_localstorage";
        private const string USERNAME = "ваш_username";
        
        static async Task Main(string[] args)
        {
            Console.WriteLine("=== Pitch Launcher ===");
            Console.WriteLine("Проверка лицензии...\n");

            try
            {
                // 1. Получаем HWID
                string hwid = GetHWID();
                Console.WriteLine($"HWID: {hwid.Substring(0, 8)}...{hwid.Substring(hwid.Length - 8)}");

                // 2. Проверяем лицензию на сервере
                var result = await CheckLaunch(USER_ID, hwid, USERNAME);

                if (result.CanLaunch)
                {
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.WriteLine("\n✓ Лицензия активна!");
                    Console.WriteLine($"Токен: {result.Token.Substring(0, 16)}...");
                    Console.ResetColor();

                    // 3. Запускаем основной клиент
                    Console.WriteLine("\nЗапуск клиента...");
                    LaunchClient();
                }
                else
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine($"\n✗ Ошибка: {result.Error}");
                    Console.ResetColor();
                    
                    Console.WriteLine("\nНажмите любую клавишу для выхода...");
                    Console.ReadKey();
                }
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"\n✗ Ошибка запуска: {ex.Message}");
                Console.ResetColor();
                
                Console.WriteLine("\nНажмите любую клавишу для выхода...");
                Console.ReadKey();
            }
        }

        /// <summary>
        /// Получает уникальный HWID компьютера
        /// </summary>
        static string GetHWID()
        {
            try
            {
                // Собираем данные из разных источников для создания уникального HWID
                string cpuId = GetCPUId();
                string diskSerial = GetDiskSerial();
                string motherboardId = GetMotherboardId();
                
                // Комбинируем и хешируем
                string combined = $"{cpuId}-{diskSerial}-{motherboardId}";
                
                using (SHA256 sha256 = SHA256.Create())
                {
                    byte[] bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(combined));
                    StringBuilder builder = new StringBuilder();
                    for (int i = 0; i < bytes.Length; i++)
                    {
                        builder.Append(bytes[i].ToString("x2"));
                    }
                    return builder.ToString();
                }
            }
            catch
            {
                // Fallback - используем имя компьютера + случайный GUID
                return $"{Environment.MachineName}-{Guid.NewGuid().ToString("N")}";
            }
        }

        /// <summary>
        /// Получает ID процессора
        /// </summary>
        static string GetCPUId()
        {
            try
            {
                string cpuId = "";
                using (ManagementClass mc = new ManagementClass("win32_processor"))
                {
                    ManagementObjectCollection moc = mc.GetInstances();
                    foreach (ManagementObject mo in moc)
                    {
                        cpuId = mo.Properties["processorId"].Value.ToString();
                        break;
                    }
                }
                return cpuId;
            }
            catch
            {
                return "UNKNOWN_CPU";
            }
        }

        /// <summary>
        /// Получает серийный номер диска
        /// </summary>
        static string GetDiskSerial()
        {
            try
            {
                string diskSerial = "";
                using (ManagementClass mc = new ManagementClass("Win32_DiskDrive"))
                {
                    ManagementObjectCollection moc = mc.GetInstances();
                    foreach (ManagementObject mo in moc)
                    {
                        diskSerial = mo.Properties["SerialNumber"].Value?.ToString() ?? "UNKNOWN_DISK";
                        break;
                    }
                }
                return diskSerial;
            }
            catch
            {
                return "UNKNOWN_DISK";
            }
        }

        /// <summary>
        /// Получает ID материнской платы
        /// </summary>
        static string GetMotherboardId()
        {
            try
            {
                string motherboardId = "";
                using (ManagementClass mc = new ManagementClass("Win32_BaseBoard"))
                {
                    ManagementObjectCollection moc = mc.GetInstances();
                    foreach (ManagementObject mo in moc)
                    {
                        motherboardId = mo.Properties["SerialNumber"].Value?.ToString() ?? "UNKNOWN_MB";
                        break;
                    }
                }
                return motherboardId;
            }
            catch
            {
                return "UNKNOWN_MB";
            }
        }

        /// <summary>
        /// Отправляет запрос на сервер для проверки лицензии
        /// </summary>
        static async Task<LaunchResult> CheckLaunch(string userId, string hwid, string username)
        {
            using (HttpClient client = new HttpClient())
            {
                var requestData = new
                {
                    userId = userId,
                    hwid = hwid,
                    username = username
                };

                string json = JsonConvert.SerializeObject(requestData);
                StringContent content = new StringContent(json, Encoding.UTF8, "application/json");

                HttpResponseMessage response = await client.PostAsync(API_URL, content);
                string responseJson = await response.Content.ReadAsStringAsync();

                JObject result = JObject.Parse(responseJson);

                return new LaunchResult
                {
                    CanLaunch = result["canLaunch"]?.Value<bool>() ?? false,
                    Token = result["token"]?.Value<string>(),
                    Error = result["error"]?.Value<string>(),
                    ExpiresAt = result["expiresAt"]?.Value<DateTime>()
                };
            }
        }

        /// <summary>
        /// Запускает основной клиент
        /// </summary>
        static void LaunchClient()
        {
            // Здесь запускается ваш основной клиент
            // Например:
            // System.Diagnostics.Process.Start("pitch-client.exe");
            
            Console.WriteLine("Клиент запущен!");
            
            // Или запускаем основной код здесь:
            // var client = new PitchClient();
            // client.Run();
        }
    }

    class LaunchResult
    {
        public bool CanLaunch { get; set; }
        public string Token { get; set; }
        public string Error { get; set; }
        public DateTime? ExpiresAt { get; set; }
    }
}
