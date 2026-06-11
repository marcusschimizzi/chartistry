import { Chart, Bubbles, XAxis, YAxis, Grid, Tooltip } from '@chartistry/react';

interface Country {
  name: string;
  income: number; // GDP per capita (x)
  life: number; // life expectancy (y)
  population: number; // millions (bubble size)
  region: string; // color
}

const data: Country[] = [
  { name: 'Aland', income: 8000, life: 66, population: 210, region: 'Asia' },
  { name: 'Brava', income: 14000, life: 72, population: 48, region: 'Americas' },
  { name: 'Corin', income: 42000, life: 81, population: 65, region: 'Europe' },
  { name: 'Delta', income: 3200, life: 59, population: 95, region: 'Africa' },
  { name: 'Esca', income: 52000, life: 83, population: 12, region: 'Europe' },
  { name: 'Faro', income: 21000, life: 76, population: 130, region: 'Asia' },
  { name: 'Gita', income: 6400, life: 64, population: 220, region: 'Africa' },
  { name: 'Hollin', income: 33000, life: 79, population: 38, region: 'Americas' },
];

/** A bubble chart: income vs. life expectancy, population as area, region as color. */
export default function BubbleExample() {
  return (
    <Chart
      width={640}
      height={380}
      data={data}
      x={(d) => d.income}
      y={(d) => d.life}
      yDomain={[55, 85]}
      margin={{ top: 16, right: 24, bottom: 36, left: 44 }}
      title="Income vs. life expectancy"
      description="Each bubble is a country; area is population, color is region."
      xLabel="Income"
    >
      <Grid />
      <YAxis />
      <XAxis />
      <Bubbles
        size={(d) => (d as Country).population}
        color={(d) => (d as Country).region}
        sizeRange={[5, 34]}
        stroke="#ffffff"
        strokeWidth={1}
      />
      <Tooltip />
    </Chart>
  );
}
