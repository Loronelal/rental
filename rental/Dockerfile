# Базовый образ для сборки
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Копируем csproj и восстанавливаем зависимости
COPY ["rental.csproj", "./"]
RUN dotnet restore

# Копируем все остальные файлы и собираем приложение
COPY . .
RUN dotnet publish -c Release -o /app/publish

# Базовый образ для выполнения
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Копируем собранное приложение
COPY --from=build /app/publish .

# Копируем статические файлы (HTML, CSS, JS) если они не в wwwroot
# Если статика лежит в корне, её нужно скопировать отдельно
# Если у вас есть папка wwwroot, то она уже скопирована через COPY . .
# Но если файлы .html, .css, .js лежат в корне, нужно скопировать их
COPY *.html ./
COPY *.css ./
COPY *.js ./
# Если есть папка images, тоже копируем
COPY images ./images

# Устанавливаем порт (обычно 80 для HTTP, 443 для HTTPS)
EXPOSE 80
EXPOSE 443

# Переменные окружения для подключения к PostgreSQL
ENV ASPNETCORE_URLS=http://+:80
# Если используете HTTPS, добавьте сертификаты

ENTRYPOINT ["dotnet", "rental.dll"]