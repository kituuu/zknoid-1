import { clsx } from 'clsx';
import { useField } from 'formik';
import { motion } from 'framer-motion';

export const Checkbox = ({
  isReadonly,
  ...props
}: {
  isReadonly?: boolean;
  name: string;
}) => {
  const [field, meta] = useField({ ...props, type: 'checkbox' });

  return (
    <motion.input
      type="checkbox"
      className={clsx('rounded-[5px] border p-1', {
        'hover:border-[#FF00009C]': meta.error && !meta.value,
        'border-[#FF0000]': meta.error,
        'cursor-pointer hover:opacity-80': !isReadonly,
      })}
      animate={
        meta.value
          ? { borderColor: '#D2FF00', backgroundColor: '#D2FF00' }
          : { borderColor: '#F9F8F4', backgroundColor: '#212121' }
      }
      transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
    >
      <motion.svg
        aria-hidden="true"
        role="presentation"
        viewBox="0 0 17 18"
        className={'h-3.5 w-3.5'}
      >
        <motion.polyline
          fill="none"
          points="1 9 7 14 15 4"
          stroke="#252525"
          strokeDasharray="22"
          strokeDashoffset="44"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          animate={meta.value ? { pathLength: 1 } : { pathLength: 0 }}
        ></motion.polyline>
      </motion.svg>
    </motion.input>
  );
};
