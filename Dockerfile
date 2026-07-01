FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY ["rental/rental.csproj", "./"]
RUN dotnet restore

COPY rental/ .
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

COPY rental/*.html ./
COPY rental/*.css ./
COPY rental/*.js ./
COPY rental/images ./images

EXPOSE 80
ENV ASPNETCORE_URLS=http://+:80
ENTRYPOINT ["dotnet", "rental.dll"]