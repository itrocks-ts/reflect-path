import { Address }     from './address.js'
import { BaseInvoice } from './base-invoice.js'
import { Customer }    from './customer.js'

export class Invoice extends BaseInvoice
{

	ambiguous!:       Customer | Address
	complex!:         (Customer | null)[]
	customerArray!:   Array<Customer>
	customerList?:    Customer[]
	customerMap!:     Record<string, Customer>
	date!:            Date
	dateArray!:       Date[]
	dateMap!:         Record<string, Date>
	deliveryAddress!: Address
	genericDates!:    Array<Date>
	mixed!:           Customer | string
	nullable!:        Customer | null | undefined
	nullableDate!:    Date | null | undefined
	numbers!:         number[]
	optionalDate?:    Date
	unknown!:         unknown

}
