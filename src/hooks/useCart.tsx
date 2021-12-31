import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { isExpressionStatement, resolveTypeReferenceDirective } from 'typescript';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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

type Products = Omit<Product, 'amount'>

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });


  const addProduct = async (productId: number) => {
    try {
      // should not be able add a product that does not exist
      const stockCheck = await api.get<UpdateProductAmount>(`/stock/${productId}`).then(response => response.data);
      const productCheck = await api.get<Products>(`/products/${productId}`).then(response => response.data);
      const [ cartProduct ] = cart.filter(elem => elem.id === productId);
      // should not be able to increase a product amount when running out of stock
      if (stockCheck.amount === 1) {
        toast.error("Quantidade solicitada fora de estoque")
        throw new Error();
      }
      // should be able to increase a product amount when adding a product that already exists on cart
      if (cart.some(elem => elem.id === productId && stockCheck.amount >= 1)) {
        const newCart = cart.map(product => product.id === productId ? { ...product, amount: product.amount + 1 } : product)
        setCart([...newCart])
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      }
      // should be able to add a new product
      else {
        const newCart = [...cart, { ...productCheck, amount: 1 }]
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      }

    } catch (error: any) {
      toast.error('Erro na adição do produto')

    }
  };

  const removeProduct = (productId: number) => {
    try {
      // should not be able to update a product that does not exist
      if (!cart.some(elem => elem.id === productId)) throw new Error();

      // should be able to remove a product
      const filteredCart = cart.filter(elem => elem.id !== productId)
      setCart(filteredCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(filteredCart))

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      // should not be able to update a product that does not exist
      const stockCheck = await api.get<UpdateProductAmount>(`/stock/${productId}`).then(response => response.data);

      // should not be able to update a product amount to a value smaller than 1
      if (amount === 0) throw new Error()

      // should not be able to increase a product amount when running out of stock
      if (stockCheck.amount === 1) {
        toast.error("Quantidade solicitada fora de estoque")
        throw new Error();
      }

      // should be able to update a product amount
      const updatedCart = cart.map(product => product.id === productId ? { ...product, amount: amount } : product);
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
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
