import { axiosClient } from "../services/axiosClient";
import type { RespuestaPaginada } from "./types";

// Por qué subió o bajó el saldo (backend: monedas.MovimientoMonedas.Tipo).
export type TipoMovimientoMonedas = "GANADA" | "PAGO" | "DEVOLUCION" | "RETIRO" | "AJUSTE";

// Una línea del historial de monedas del usuario.
export interface MovimientoMonedas {
  id: number;
  // Positivo si sumó al saldo, negativo si restó.
  cantidad: number;
  tipo: TipoMovimientoMonedas;
  saldo_resultante: number;
  // Motivo escrito por el admin (solo en los ajustes manuales).
  nota: string;
  codigo_orden: string | null;
  fecha: string;
}

// Por qué el servidor rechazó un pago con monedas.
export type MotivoPagoMonedasRechazado = "saldo_insuficiente" | "no_pagable";

export const monedasApi = {
  // Historial del usuario con sesión, lo más reciente primero. El saldo
  // actual viaja en su perfil (perfil.api.ts → saldo_monedas).
  listarMovimientos: async (page: number): Promise<RespuestaPaginada<MovimientoMonedas>> => {
    const { data } = await axiosClient.get<RespuestaPaginada<MovimientoMonedas>>("monedas/movimientos/", {
      params: { page },
    });
    return data;
  },

  // Solo admin: suma (cantidad positiva) o quita (negativa) monedas a un
  // usuario, con un motivo que queda en su historial. Devuelve su saldo nuevo.
  ajustar: async (usuario: number, cantidad: number, nota: string): Promise<number> => {
    const { data } = await axiosClient.post<{ saldo_monedas: number }>("monedas/admin/ajustes/", {
      usuario,
      cantidad,
      nota,
    });
    return data.saldo_monedas;
  },
};
