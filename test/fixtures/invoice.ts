import { Address }     from './address.js'
import { BaseInvoice } from './base-invoice.js'
import { Customer }    from './customer.js'

export class Invoice extends BaseInvoice
{

	ambiguous!:        Customer | Address
	complex!:          (Customer | null)[]
	customerArray!:    Array<Customer>
	customerList?:     Customer[]
	customerMap!:      Record<string, Customer>
	deliveryAddress!:  Address
	mixed!:            Customer | string
	nullable!:         Customer | null | undefined
	numbers!:          number[]
	unknown!:          unknown

}
