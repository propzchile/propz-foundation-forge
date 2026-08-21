# propzchile

Estamos construyendo PROPZ 6.0.

Este es el inicio de la Fase 3 de desarrollo. Antes de implementar funcionalidades avanzadas, debes establecer una arquitectura sólida, escalable y coherente con el Documento Maestro Propz 6.0 v0.4.

IMPORTANTE:

No improvises funcionalidades que no estén solicitadas en este prompt.

No avances por tu cuenta hacia dashboards, IA avanzada, conciliación bancaria, planes comerciales ni otros módulos que serán construidos en prompts posteriores.

El objetivo de este primer bloque es construir correctamente la FUNDACIÓN de Propz 6.0.

==================================================

1. PRINCIPIO GENERAL DEL PRODUCTO

==================================================

Propz es una plataforma inteligente para la administración de propiedades.

Debe estar preparada para funcionar bajo dos modelos principales:

A) PROPIETARIO AUTOGESTIONADO

Un usuario administra directamente sus propias propiedades.

Jerarquía:

PROPIETARIO

  └── PROPIEDADES

       └── UNIDADES

            └── CONTRATOS

                 └── ARRENDATARIOS

B) ADMINISTRADOR PROFESIONAL

Un usuario administrador gestiona propiedades pertenecientes a múltiples propietarios/clientes.

Jerarquía:

ADMINISTRADOR

  └── PROPIETARIOS / CLIENTES

       └── PROPIEDADES

            └── UNIDADES

                 └── CONTRATOS

                      └── ARRENDATARIOS

ESTA DIFERENCIA ES FUNDAMENTAL.

No debe implementarse solamente como una diferencia visual del frontend.

Debe existir en el modelo de datos, relaciones, permisos, navegación y contexto de la aplicación.

==================================================

2. OBJETIVO DE ESTE PROMPT

==================================================

Construir:

- autenticación;

- usuarios;

- roles;

- propietarios/clientes;

- administradores;

- propiedades;

- unidades;

- contratos;

- arrendatarios;

- relaciones entre estas entidades;

- permisos básicos;

- aislamiento de datos;

- navegación contextual;

- y una estructura preparada para crecer.

No construir todavía:

- Dashboard Gerencial definitivo;

- Dashboard Operativo definitivo;

- Centro de IA;

- conciliación bancaria;

- cobranza automática;

- documentos inteligentes;

- planes comerciales;

- Webpay;

- reportes avanzados;

- automatizaciones;

- integraciones externas.

Esos bloques vendrán posteriormente.

==================================================

3. USUARIOS

==================================================

Crear una entidad de usuario que permita posteriormente soportar diferentes perfiles.

Como mínimo debe contemplar:

- id único;

- nombre;

- apellido;

- email;

- teléfono;

- estado;

- rol;

- fecha de creación;

- fecha de actualización.

El sistema debe estar preparado para múltiples roles sin tener que rediseñar la arquitectura posteriormente.

Los roles iniciales deben contemplar:

- PROPIETARIO

- ADMINISTRADOR

Dejar la arquitectura preparada para agregar otros roles posteriormente.

==================================================

4. ADMINISTRADOR

==================================================

Un administrador puede gestionar múltiples propietarios/clientes.

Debe existir una relación explícita entre:

ADMINISTRADOR ↔ PROPIETARIO

Un administrador puede tener muchos propietarios.

Un propietario puede eventualmente estar asociado a más de un administrador si el modelo futuro lo requiere.

No asumir que administrador y propietario son la misma entidad.

El administrador es quien presta o ejecuta la administración.

El propietario es dueño de los activos administrados.

==================================================

5. PROPIETARIOS / CLIENTES

==================================================

Crear la entidad propietario.

Debe poder existir independientemente de un usuario de acceso.

Esto es importante porque un administrador puede registrar a un propietario/cliente que todavía no tenga una cuenta propia en Propz.

La entidad debe permitir posteriormente:

- datos personales o empresariales;

- información de contacto;

- estado;

- propiedades asociadas;

- administrador responsable.

No duplicar innecesariamente la información entre USER y OWNER.

Diseñar correctamente la relación entre ambas entidades.

==================================================

6. PROPIEDADES

==================================================

Crear la entidad propiedad.

Cada propiedad debe pertenecer a un propietario.

Campos mínimos:

- id;

- propietario;

- tipo de propiedad;

- nombre o alias;

- dirección;

- comuna;

- ciudad;

- región;

- país;

- estado;

- fecha de creación;

- fecha de actualización.

El sistema debe permitir múltiples propiedades por propietario.

Ejemplos de tipos:

- departamento;

- casa;

- oficina;

- local;

- estacionamiento;

- bodega;

- terreno;

- otro.

No limitar artificialmente el modelo para que solamente funcione con departamentos.

==================================================

7. UNIDADES

==================================================

Una propiedad puede contener una o múltiples unidades.

Crear una entidad UNIT relacionada con PROPERTY.

Ejemplos:

Una propiedad puede tener:

- departamento;

- estacionamiento;

- bodega.

Cada unidad debe poder identificarse individualmente.

Campos mínimos:

- id;

- propiedad;

- tipo;

- identificador;

- nombre o alias;

- estado.

La arquitectura debe permitir determinar posteriormente si una unidad:

- se arrienda conjuntamente;

- se arrienda independientemente;

- o forma parte de un conjunto de unidades.

No desarrollar todavía la lógica completa de contratos múltiples. Solo dejar correctamente preparada la relación.

==================================================

8. ARRENDATARIOS

==================================================

Crear la entidad TENANT.

Campos mínimos:

- id;

- nombre;

- apellido o razón social;

- RUT/identificador;

- email;

- teléfono;

- estado;

- fecha de creación;

- fecha de actualización.

Un arrendatario podrá tener relación con contratos.

No asumir que un arrendatario está permanentemente ligado a una única propiedad.

El historial contractual deberá poder mantenerse posteriormente.

==================================================

9. CONTRATOS

==================================================

Crear la entidad CONTRACT.

Debe relacionar como mínimo:

- propietario;

- propiedad;

- unidad;

- arrendatario.

Campos iniciales:

- id;

- fecha de inicio;

- fecha de término;

- estado;

- monto de arriendo;

- periodicidad;

- día de vencimiento;

- moneda;

- fecha de creación;

- fecha de actualización.

Los estados deben quedar preparados para una máquina de estados posterior.

Por ahora utilizar estados básicos coherentes, por ejemplo:

- BORRADOR

- ACTIVO

- FINALIZADO

- CANCELADO

No implementar todavía reajustes, cobranza ni obligaciones financieras avanzadas.

==================================================

10. HISTORIAL

==================================================

La arquitectura debe permitir mantener historial.

No eliminar información histórica importante simplemente porque un contrato terminó o una propiedad dejó de estar activa.

Debe poder distinguirse:

- activo;

- histórico;

- eliminado/archivado cuando corresponda.

Evitar hard delete de entidades críticas cuando esto pueda romper trazabilidad.

==================================================

11. PERMISOS Y AISLAMIENTO

==================================================

Este punto es CRÍTICO.

Un usuario propietario solamente puede acceder a la información que corresponde a su cartera.

Un administrador solamente puede acceder a los propietarios y activos que administra.

Debe existir aislamiento a nivel de backend/base de datos, no solamente ocultando elementos en la interfaz.

No confiar únicamente en validaciones del frontend.

Las consultas deben respetar siempre:

USUARIO

→ ROL

→ RELACIONES AUTORIZADAS

→ DATOS ACCESIBLES

Un usuario no debe poder obtener datos de otro propietario modificando parámetros, URLs, IDs o llamadas API.

==================================================

12. CONTEXTO JERÁRQUICO

==================================================

La aplicación debe mantener contexto.

Para un propietario:

Mi cartera

→ Propiedad

→ Unidad

→ Contrato

→ Arrendatario

Para un administrador:

Mi administración

→ Propietario/Cliente

→ Propiedad

→ Unidad

→ Contrato

→ Arrendatario

El sistema debe saber en qué contexto está trabajando el usuario.

Esto será fundamental posteriormente para dashboards, IA, notificaciones, reportes y automatizaciones.

==================================================

13. MODELO PREPARADO PARA ESCALAR

==================================================

Diseñar la arquitectura para que posteriormente podamos incorporar:

- obligaciones financieras;

- pagos;

- movimientos bancarios;

- conciliación;

- documentos;

- incidencias;

- automatizaciones;

- IA;

- notificaciones;

- dashboards;

- planes comerciales;

- suscripciones;

- Webpay;

- permisos por plan;

- límites de uso;

- importación/exportación;

- integraciones externas.

NO IMPLEMENTAR todavía esas funcionalidades.

Pero tampoco diseñar la arquitectura de forma que posteriormente sea necesario rehacer las entidades principales.

==================================================

14. REGLAS DE ARQUITECTURA

==================================================

Separar claramente:

- autenticación;

- autorización;

- usuarios;

- propietarios;

- propiedades;

- unidades;

- contratos;

- arrendatarios.

Evitar duplicación de datos.

Evitar lógica de negocio crítica exclusivamente en componentes visuales.

Mantener las relaciones entre entidades explícitas.

Utilizar IDs únicos y relaciones consistentes.

Preparar validaciones de integridad.

Preparar la arquitectura para auditoría futura.

Preparar la arquitectura para APIs e integraciones futuras.

==================================================

15. INTERFAZ INICIAL

==================================================

Construir solamente una interfaz funcional mínima que permita comprobar la arquitectura.

Debe permitir:

- iniciar sesión;

- identificar el tipo de usuario;

- crear/visualizar propietarios;

- crear/visualizar propiedades;

- crear/visualizar unidades;

- crear/visualizar arrendatarios;

- crear/visualizar contratos;

- navegar respetando la jerarquía.

NO diseñar todavía el dashboard definitivo.

La interfaz debe ser limpia, profesional y consistente con la identidad de Propz, pero en esta etapa la prioridad absoluta es la arquitectura y funcionamiento correcto.

==================================================

16. DATOS DE PRUEBA

==================================================

Crear datos demo realistas para poder probar ambos escenarios.

ESCENARIO 1:

Propietario:

Juan Pérez

Propiedades:

- Departamento

- Casa

ESCENARIO 2:

Administrador:

Administraciones Propz Demo

Propietarios:

- Juan Pérez

- María González

- Inversiones ABC

Cada propietario debe tener varias propiedades y algunas propiedades deben tener múltiples unidades.

Crear contratos y arrendatarios suficientes para comprobar las relaciones.

Los datos demo deben estar claramente separados de datos reales.

==================================================

17. VALIDACIONES OBLIGATORIAS

==================================================

Antes de considerar terminado este bloque, comprobar:

1. Un propietario puede tener múltiples propiedades.

2. Un administrador puede tener múltiples propietarios.

3. Cada propietario puede tener múltiples propiedades.

4. Cada propiedad puede tener múltiples unidades.

5. Una unidad puede tener historial de contratos.

6. Un contrato puede relacionar correctamente unidad y arrendatario.

7. Un propietario no puede acceder a información de otro propietario.

8. Un administrador solamente puede acceder a los propietarios que administra.

9. La navegación refleja correctamente la jerarquía.

10. Las relaciones están implementadas en backend/base de datos y no solamente en frontend.

11. No existen duplicaciones innecesarias de entidades.

12. La arquitectura queda preparada para agregar los módulos futuros sin reconstruir este núcleo.

==================================================

18. MUY IMPORTANTE: NO AVANZAR

==================================================

No implementes todavía el Prompt 2.

No implementes todavía:

- planes;

- suscripciones;

- Webpay;

- dashboards;

- IA;

- conciliación;

- cobranza;

- documentos inteligentes;

- importación/exportación masiva;

- automatizaciones.

Primero termina correctamente esta fundación.

==================================================

19. ENTREGA AL FINAL DEL TRABAJO

==================================================

Cuando termines este bloque, NO continúes automáticamente.

Entrégame un resumen técnico que indique:

A. Qué arquitectura implementaste.

B. Qué entidades creaste.

C. Qué relaciones creaste.

D. Cómo implementaste los permisos y aislamiento.

E. Qué rutas/pantallas creaste.

F. Qué datos demo incorporaste.

G. Qué queda preparado para las siguientes fases.

H. Cualquier decisión técnica que hayas tenido que tomar y que no estuviera explícitamente definida.

I. Cualquier limitación o riesgo que detectes.

J. Confirma explícitamente que NO implementaste funcionalidades correspondientes a los siguientes prompts.

DETENTE después de entregar este resumen.

Esperaremos revisión y aprobación antes de continuar con el Prompt 2.

==================================================

REGLA FINAL

La prioridad de este prompt es:

ARQUITECTURA CORRECTA > VELOCIDAD DE DESARROLLO.

No queremos solamente una interfaz que parezca funcionar.

Queremos construir la base real de Propz 6.0 sobre la cual puedan construirse de manera segura todas las fases posteriores.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bfc58023-34cc-4897-81e0-9e61ee134182).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
