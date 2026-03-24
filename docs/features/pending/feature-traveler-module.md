# 🧾 Feature Request — Módulo de Viajeros

## 🎯 Contexto

La aplicación es una plataforma de gestión de viajes locales que permite rentar camiones a diferentes proveedores. Actualmente el sistema cuenta con:

* Un dashboard de viajes
* Un catálogo de proveedores
* Un catálogo de unidades (camiones)

Se requiere expandir el sistema para gestionar a los clientes que reservan lugares en los viajes.

---

## 🚀 Objetivo

Crear el módulo de gestión de clientes, denominado **"Viajeros"**, que permita registrar y administrar a las personas que reservan lugares en los viajes.

---

## 📌 Requerimientos Funcionales

### 1. Módulo de Navegación

* Agregar una nueva opción en el menú principal llamada **"Viajeros"**

---

### 2. Gestión de Viajeros (CRUD)

El sistema debe permitir:

* Crear viajeros
* Consultar viajeros
* Actualizar viajeros
* Eliminar viajeros

---

### 3. Datos del Viajero

Cada viajero debe contener la siguiente información:

* Nombre
* Apellido
* Teléfono
* Viaje(s) asociado(s)
* Camión asignado
* Asiento asignado
* Punto de abordaje
* Indicador: ¿Es representante de grupo?
* Teléfono (validar duplicado si aplica)

#### Regla especial:

* Si el viajero **NO es representante de grupo**, debe existir un campo que permita identificar quién es su representante o líder de grupo.

---

### 4. Visualización

* Mostrar un listado de todos los viajeros
* Incluir información clave:

  * Nombre completo
  * Viaje
  * Camión
  * Asiento
  * Representante de grupo (sí/no)

---

### 5. Filtros

* Filtrar viajeros por:

  * Viaje
  * Camión

---

## 🧠 Consideraciones de Negocio

* Un viajero puede pertenecer a un grupo
* Un grupo tiene un representante
* La relación entre viajeros debe permitir identificar jerarquía (líder → acompañantes)

---

## ✅ Resultado Esperado

Un módulo funcional de "Viajeros" completamente integrado al sistema, que permita gestionar clientes de viajes individuales o grupales de forma clara y organizada.
