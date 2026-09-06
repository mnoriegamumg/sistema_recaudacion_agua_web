export interface PagoRequest {
    id_contador: number;
    monto: number;
    mes_pagado: number;
    ano_pagado: number;
    periodo_inicio: string;
    periodo_fin: string;
    es_pago_anual?: boolean;
    pagado_por: string;
    identificacion?: string;
    observaciones?: string;
}

export interface PagoResponse {
    success: boolean;
    data: {
        id_pago: number;
        numero_recibo: string;
        monto: number;
        mes_pagado: number;
        ano_pagado: number;
        pagado_por: string;
        // ... otros campos
    };
    numero_recibo: string;
}