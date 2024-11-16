# Carpool 21 - BackEnd

<p align="center">
  <img alt="carpool_logo" src="./assets/img/logo-carpool21.png" width="150" />
</p>

A new NestJs Application for students at Universidad Empresarial Siglo 21.

Developed by:
  - Juan Mantese
    
    Legajo: SOF01669
    
    DNI: 43272208

## Getting Started

### Requisitos tecnicos:

1- Utilizar version de Node (v20.10.0)

2- Utilizar version de NestJs (10.3.2)

3- Tener instalado MySQL (versión utilizada 8.4.0)

4- Tener instalado MySQL Workbench (versión utilizada 8.4.0)


### Ajustes
En el archivo 'main.ts' se debe modificar esta linea: 'await app.listen(3000, 'URL_PC' || 'localhost');'
En URL_PC se debe colocar la IP de la computadora. Ej: 172.26.208.1
- En windows el comando para saber la IP es: ipconfig
Se debe buscar el IPV4
- En mac el comando para saber la IP es: ifconfig
Se debe buscar el INET

En el *app.module.ts* se debe configurar la conexion a la base de datos:
   * type: 'mysql',
   * host: 'localhost',
   * port: 3306,
   * username: 'root',
   * password: '12345678',
   * database: 'carpool21',
   * entities: [__dirname + '/**/*.entity{.ts,.js}'],
   * synchronize: true,

### Pasos para levantar el proyecto
1- Instalacion de dependencias
  Ejecutamos: 
  ```
  npm i 
  ```

2- Levantar el proyecto
  Ejecutamos: 
  ``` 
  npm run start:dev 
  ```
