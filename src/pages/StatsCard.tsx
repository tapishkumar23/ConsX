type Props = {
  title: string;
  value: string;
  change?: string;
};

const StatsCard = ({ title, value, change }: Props) => {
  return (
    <div className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition">
      <h3 className="text-gray-500 text-sm">{title}</h3>

      <div className="flex items-center justify-between mt-2">
        <p className="text-2xl font-bold">{value}</p>
        {change && (
          <span className="text-green-500 text-sm">{change}</span>
        )}
      </div>
    </div>
  );
};

export default StatsCard;