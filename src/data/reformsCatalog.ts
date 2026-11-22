import type { OrderFormValues, OrderStatus } from '../types/order';

export interface StatusMetadata {
  value: OrderStatus;
  label: string;
  shortLabel: string;
  description: string;
  textClass: string;
}

export const ORDER_STATUS_LIST: StatusMetadata[] = [
  {
    value: 'pendiente_laboratorio',
    label: 'Pendiente laboratorio',
    shortLabel: 'Pend. laboratorio',
    description: 'Expediente enviado o pendiente de informe de conformidad del laboratorio.',
    textClass: 'text-blue-700',
  },
  {
    value: 'pendiente_cliente',
    label: 'Pendiente cliente',
    shortLabel: 'Pend. cliente',
    description: 'A la espera de documentación, fotografías o confirmación por parte del cliente.',
    textClass: 'text-amber-700',
  },
  {
    value: 'pendiente_modificacion_vplus',
    label: 'Pendiente modificación VPlus',
    shortLabel: 'Pend. mod. VPlus',
    description: 'Pendiente de corrección o modificación técnica en plataforma VPlus.',
    textClass: 'text-violet-700',
  },
  {
    value: 'pendiente_itv',
    label: 'Pendiente ITV',
    shortLabel: 'Pendiente ITV',
    description: 'Documentación lista; vehículo pendiente de pasar inspección en ITV.',
    textClass: 'text-indigo-700',
  },
  {
    value: 'rechazado_itv',
    label: 'Rechazado ITV',
    shortLabel: 'Rechazado ITV',
    description: 'Inspección desfavorable en ITV; requiere subsanación técnica o documental.',
    textClass: 'text-rose-700',
  },
  {
    value: 'pendiente_cobrar',
    label: 'Pendiente cobrar',
    shortLabel: 'Pend. cobrar',
    description: 'Expediente tramitado o entregado, pendiente de recibir el cobro del cliente.',
    textClass: 'text-orange-700',
  },
  {
    value: 'terminado',
    label: 'Terminado',
    shortLabel: 'Terminado',
    description: 'Reforma legalizada e inscrita en ficha técnica. Expediente cerrado.',
    textClass: 'text-emerald-700',
  },
  {
    value: 'cancelado',
    label: 'Cancelado',
    shortLabel: 'Cancelado',
    description: 'Pedido anulado por el cliente o inviable técnicamente. Expediente cerrado.',
    textClass: 'text-slate-500',
  },
];

export const ORDER_STATUS_MAP: Record<OrderStatus, StatusMetadata> =
  ORDER_STATUS_LIST.reduce(
    (acc, item) => {
      acc[item.value] = item;
      return acc;
    },
    {} as Record<OrderStatus, StatusMetadata>
  );

export interface ReformCodeEntry {
  code: string;
  section: string;
  title: string;
  summary: string;
}

export const REFORM_CODES_CATALOG: ReformCodeEntry[] = [
  {
    code: '1.1',
    section: '1. Identificación',
    title: 'Emplazamiento de la placa de matrícula',
    summary: 'Modificación de la ubicación o fijación de la placa de matrícula trasera o delantera.',
  },
  {
    code: '2.1',
    section: '2. Unidad motriz',
    title: 'Modificación de las características o sustitución del motor',
    summary: 'Cambio de motor por otro de distinta referencia, potencia o código de homologación.',
  },
  {
    code: '2.6',
    section: '2. Unidad motriz',
    title: 'Modificación del sistema de escape',
    summary: 'Sustitución de silenciadores o tramo de escape que altere geometría o homologación.',
  },
  {
    code: '2.9',
    section: '2. Unidad motriz',
    title: 'Modificación del sistema de alimentación de combustible (GLP/GNC)',
    summary: 'Instalación de kits bifuel de gas licuado del petróleo o gas natural.',
  },
  {
    code: '3.1',
    section: '3. Transmisión',
    title: 'Modificación de la caja de cambios o relación de transmisión',
    summary: 'Sustitución de caja de cambios, diferenciales o instalación de bloqueos.',
  },
  {
    code: '4.1',
    section: '4. Ejes y ruedas',
    title: 'Sustitución de ejes',
    summary: 'Cambio de eje delantero o trasero por otro de características diferentes.',
  },
  {
    code: '4.4',
    section: '4. Ejes y ruedas',
    title: 'Modificación de la distancia entre vías (separadores / llantas)',
    summary: 'Instalación de separadores de rueda o llantas con distinto desplazamiento (ET).',
  },
  {
    code: '4.5',
    section: '4. Ejes y ruedas',
    title: 'Sustitución de neumáticos por otros no equivalentes',
    summary: 'Montaje de neumáticos fuera del margen de equivalencia del 3% o índice inferior.',
  },
  {
    code: '5.1',
    section: '5. Suspensión',
    title: 'Modificación de las características del sistema de suspensión',
    summary: 'Instalación de muelles deportivos, suspensión roscada, neumática o kits de elevación.',
  },
  {
    code: '6.1',
    section: '6. Dirección',
    title: 'Modificación del sistema de dirección',
    summary: 'Sustitución de volante deportivo con variación de diámetro superior al 10% o columna.',
  },
  {
    code: '7.1',
    section: '7. Frenos',
    title: 'Modificación de las características del sistema de frenado',
    summary: 'Instalación de discos sobredimensionados, pinzas multipistón o latiguillos metálicos.',
  },
  {
    code: '8.1',
    section: '8. Carrocería',
    title: 'Reducción o aumento del número de plazas de asiento',
    summary: 'Instalación o retirada permanente de asientos y cinturones de seguridad.',
  },
  {
    code: '8.20',
    section: '8. Carrocería',
    title: 'Acondicionamiento interior de vivienda (Camper)',
    summary: 'Instalación fija de muebles, cama, cocina, depósitos, calefacción estacionaria o placas solares.',
  },
  {
    code: '8.30',
    section: '8. Carrocería',
    title: 'Instalación de bases giratorias en asientos',
    summary: 'Montaje de plataformas giratorias homologadas bajo asientos de cabina.',
  },
  {
    code: '8.51',
    section: '8. Carrocería',
    title: 'Modificación de carrocería que afecta a dimensiones exteriores',
    summary: 'Instalación de snorkel, cabrestante, estriberas, defensa delantera o techo elevable.',
  },
  {
    code: '8.52',
    section: '8. Carrocería',
    title: 'Modificación de elementos exteriores de carrocería',
    summary: 'Instalación de paragolpes deportivos, alerón, taloneras, difusor o aletines.',
  },
  {
    code: '9.1',
    section: '9. Alumbrado',
    title: 'Adición de dispositivos de alumbrado y señalización',
    summary: 'Instalación de faros de largo alcance, barras LED o pilotos auxiliares homologados.',
  },
  {
    code: '9.2',
    section: '9. Alumbrado',
    title: 'Modificación o sustitución de dispositivos de alumbrado',
    summary: 'Sustitución de faros halógenos por ópticas LED o xenón completas homologadas.',
  },
  {
    code: '10.1',
    section: '10. Uniones',
    title: 'Instalación de dispositivo de acoplamiento (bola de remolque)',
    summary: 'Montaje de enganche de remolque fijo o desmontable con kit eléctrico.',
  },
  {
    code: '11.1',
    section: '11. Tarjeta ITV',
    title: 'Variación de la clasificación del vehículo',
    summary: 'Cambio de clasificación (ej. de furgón 2400 a turismo vivienda 1048 o autocaravana).',
  },
  {
    code: '11.2',
    section: '11. Tarjeta ITV',
    title: 'Variación de la Masa Máxima Autorizada (MMA)',
    summary: 'Aumento o reducción de MMA técnica o administrativa en tarjeta ITV.',
  },
];

export const REFORM_CODES_MAP: Record<string, ReformCodeEntry> =
  REFORM_CODES_CATALOG.reduce(
    (acc, entry) => {
      acc[entry.code] = entry;
      return acc;
    },
    {} as Record<string, ReformCodeEntry>
  );

export const VEHICLE_BRANDS: string[] = [
  'Audi',
  'BMW',
  'Citroën',
  'Cupra',
  'Dacia',
  'Fiat',
  'Ford',
  'Honda',
  'Hyundai',
  'Iveco',
  'Jeep',
  'Kia',
  'Land Rover',
  'MAN',
  'Mazda',
  'Mercedes-Benz',
  'Mini',
  'Mitsubishi',
  'Nissan',
  'Opel',
  'Peugeot',
  'Porsche',
  'Renault',
  'SEAT',
  'Škoda',
  'Subaru',
  'Suzuki',
  'Tesla',
  'Toyota',
  'Volkswagen',
  'Volvo',
];

export function buildSampleOrders(todayIso: string): OrderFormValues[] {
  const daysAgo = (offset: number): string => {
    const d = new Date(`${todayIso}T12:00:00`);
    d.setDate(d.getDate() - offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return [
    {
      licensePlate: '4821 KLP',
      orderDate: daysAgo(1),
      status: 'pendiente_laboratorio',
      vehicleBrand: 'Volkswagen',
      vehicleModel: 'Transporter T6.1',
      reformCodes: ['8.20', '8.30', '11.1'],
      vehicleReforms:
        'Camperización integral con mobiliario lateral en contrachapado, instalación de placa solar de 180W, calefacción estacionaria, bases giratorias en asientos delanteros y cambio de clasificación a furgón vivienda.',
      clientName: 'Talleres Norte Camper S.L.',
      clientContact: 'taller@nortecamper.es · 612 480 910',
      labPrice: '310.00',
      finalPrice: '590.00',
      notes: 'Enviado al laboratorio con boletín eléctrico de baja tensión.',
    },
    {
      licensePlate: '7934 MBN',
      orderDate: daysAgo(3),
      status: 'pendiente_itv',
      vehicleBrand: 'BMW',
      vehicleModel: 'Serie 3 (G20)',
      reformCodes: ['5.1', '4.4', '8.52'],
      vehicleReforms:
        'Instalación de suspensión roscada KW Variant 2 (-30 mm), separadores de 12 mm en eje trasero y difusor trasero deportivo con lip delantero.',
      clientName: 'Javier Serrano Gómez',
      clientContact: '645 219 304',
      labPrice: '185.00',
      finalPrice: '360.00',
      notes: 'Proyecto técnico e informe de conformidad enviados al cliente.',
    },
    {
      licensePlate: '2190 HTR',
      orderDate: daysAgo(5),
      status: 'pendiente_cliente',
      vehicleBrand: 'Toyota',
      vehicleModel: 'Land Cruiser KDJ150',
      reformCodes: ['5.1', '4.5', '8.51', '9.1'],
      vehicleReforms:
        'Kit de elevación +50 mm, neumáticos BFGoodrich 265/70 R17, instalación de cabrestante integrado en paragolpes delantero, snorkel lateral y barra LED de largo alcance.',
      clientName: 'Expedición 4x4 Levante',
      clientContact: 'info@expedicion4x4.es',
      labPrice: '275.00',
      finalPrice: '520.00',
      notes: 'Falta foto de referencia de muelles delanteros y número de serie del cabrestante.',
    },
    {
      licensePlate: '6052 JVC',
      orderDate: daysAgo(9),
      status: 'pendiente_modificacion_vplus',
      vehicleBrand: 'Mercedes-Benz',
      vehicleModel: 'Sprinter 316 CDI',
      reformCodes: ['10.1', '8.1'],
      vehicleReforms:
        'Instalación de enganche de remolque desmontable con centralita de 13 polos y reducción de plazas de 3 a 2 asientos en cabina.',
      clientName: 'Logística Ibérica del Sur S.A.',
      clientContact: 'flota@logisticaiberica.es',
      labPrice: '145.00',
      finalPrice: '295.00',
      notes: 'Ajustar contraseña de homologación del enganche en VPlus.',
    },
  ];
}
