import { Address } from './address.js'
import { Invoice } from './invoice.js'

export class Customer
{

	address?:  Address
	invoices!: Invoice[]
	name:      string = 'Customer'
	parent?:   Customer

}
