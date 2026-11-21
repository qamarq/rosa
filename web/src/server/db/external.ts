import { customType, doublePrecision, integer, pgTable, varchar } from "drizzle-orm/pg-core"

const geometry = customType<{ data: string }>({
  dataType: () => "geometry",
})

export const dzialki = pgTable("dzialki", {
  fid: integer("fid").primaryKey(),
  idDzialki: varchar("id_dzialki"),
  numerDzialki: varchar("numer_dzialki"),
  nazwaObrebu: varchar("nazwa_obrebu"),
  numerObrebu: varchar("numer_obrebu"),
  numerJednostki: varchar("numer_jednostki"),
  nazwaGminy: varchar("nazwa_gminy"),
  data: varchar("data"),
  poleEwidencyjne: doublePrecision("pole_ewidencyjne"),
  klasouzytkiEgib: varchar("klasouzytki_egib"),
  grupaRejestrowa: integer("grupa_rejestrowa"),
  geom: geometry("geom"),
})
