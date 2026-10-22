import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

export default function BestSellersChart({ data }) {
  const rows = data.map((d) => ({ name: d.sku, sold: d.total_sold }))
  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="sold" fill="#0d6efd" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}