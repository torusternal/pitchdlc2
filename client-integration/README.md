# Интеграция HWID защиты клиента

## Как это работает

1. **Проверка при запуске**: Клиент отправляет запрос на сервер с HWID (уникальный идентификатор компьютера)
2. **Проверка лицензии**: Сервер проверяет есть ли у пользователя активная лицензия
3. **Проверка HWID**: 
   - Если HWID ещё не привязан - привязывается автоматически (первый запуск)
   - Если HWID уже привязан - проверяется совпадение
4. **Запуск**: Если всё ок - клиент получает токен и запускается

## API Endpoints

### 1. Проверка запуска клиента
**POST** `/api/check-launch`

**Request:**
```json
{
  "userId": "123456789",
  "hwid": "abc123...xyz789",
  "username": "player123"
}
```

**Response (успех):**
```json
{
  "canLaunch": true,
  "token": "launch_token_here",
  "expiresAt": "2026-04-17T03:35:00Z",
  "user": {
    "id": "123456789",
    "username": "player123",
    "hwid": "abc123...xyz789"
  },
  "license": {
    "key": "PITCH-LIFETIME-7X9K2M4N8P",
    "type": "lifetime"
  }
}
```

**Response (ошибка):**
```json
{
  "canLaunch": false,
  "error": "Нет активной лицензии"
}
```

### 2. Получение информации о пользователе
**POST** `/api/user-info`

**Request:**
```json
{
  "userId": "123456789"
}
```

**Response:**
```json
{
  "user": {
    "id": "123456789",
    "username": "player123",
    "email": "player@example.com",
    "hwid": "abc123...xyz789",
    "created_at": "2026-04-16"
  },
  "hasLicense": true,
  "license": {
    "key": "PITCH-LIFETIME-7X9K2M4N8P",
    "type": "lifetime"
  }
}
```

## Пример интеграции (C#)

Смотрите файл `Program.cs` - полный пример интеграции.

### Быстрая интеграция:

```csharp
// 1. Получаем HWID
string hwid = GetHWID(); // Функция из Program.cs

// 2. Проверяем на сервере
var result = await CheckLaunch(userId, hwid, username);

// 3. Решаем - запускать или нет
if (result.CanLaunch) {
    // Запускаем клиент
    LaunchClient();
} else {
    // Показываем ошибку
    MessageBox.Show(result.Error);
    Exit();
}
```

## Требования

Для C# проекта установите пакет:
```bash
dotnet add package Newtonsoft.Json
```

## HWID - что это?

HWID (Hardware ID) - уникальный идентификатор компьютера, создается из:
- ID процессора
- Серийного номера диска
- ID материнской платы

**Привязка:**
- При первом запуске HWID автоматически привязывается к аккаунту
- При последующих запусках проверяется совпадение HWID
- Если HWID не совпадает - запуск блокируется

## Важно

1. **Замените в Program.cs:**
   - `API_URL` - URL вашего Vercel сайта
   - `USER_ID` - ID пользователя из localStorage
   - `USERNAME` - имя пользователя

2. **Для тестирования** используйте API endpoint `/api/check-launch`

3. **HWID** будет отображаться в профиле после первого запуска
