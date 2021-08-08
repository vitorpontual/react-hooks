import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  /* const prevCartRef = useRef<Product[]>();
  useEffect(() => {
    prevCartRef.current = cart;
  })
  const cartPreviousValue = prevCartRef.current ?? cart;
 */
  useEffect(() => {
    // if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    // }
  }, [cart, /* cartPreviousValue */])

  async function checkProductStockAvailability(productId: number, amount: number){
    const { data: stock } = await api.get(`stock/${productId}`)

    const isStockAvailable = stock.amount < amount;

    return isStockAvailable
  }

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId)

      
      const currentAmount = productExists ? productExists.amount : 0;
      const amount = currentAmount + 1;
      const stockAvailable = await checkProductStockAvailability(productId, amount)

      if (stockAvailable) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      if (productExists) {
        productExists.amount = amount;
      } else {
        const product = await api.get(`products/${productId}`)

        const newProduct = {
          ...product.data,
          amount: 1
        }
        updatedCart.push(newProduct);
      }

      setCart(updatedCart);

    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]
      const isProductOnCart = updatedCart.some(product => product.id === productId)

      if (!isProductOnCart) {
        throw Error();
      }

      const newCart = updatedCart.filter(product => {
        return product.id !== productId
      })
      setCart(newCart)
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return removeProduct(productId)
      }

      const stockAvailable = await checkProductStockAvailability(productId, amount)

      if (stockAvailable) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId)

      if (productExists) {
        productExists.amount = amount;
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };


  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
